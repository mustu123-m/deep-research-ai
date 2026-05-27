import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { buildResearchGraph } from "@/graph/graph.js";
import { saveReportToDisk } from "@/utils/report-writer.js";
import { requireAuth } from "@/api/middleware/auth.js";
import { env } from "@/config/env.js";

export const researchRouter = Router();

/**
 * Supabase client for the API.
 * Uses service role key so it can read/write any row.
 * RLS still protects the browser — this is server-only.
 */
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ─── Types ─────────────────────────────────────────────────────────────────
interface Run {
  id: string;
  userId: string;
  topic: string;
  status: "pending" | "running" | "done" | "error";
  startedAt: number;
  finishedAt?: number;
  report?: any;
  error?: string;
  events: SSEEvent[];
  subscribers: Response[];
}

interface SSEEvent {
  type: string;
  data: Record<string, any>;
  ts: number;
}

// ─── In-memory store (for active/recent runs) ───────────────────────────────
// We still keep this for SSE streaming — Supabase is for persistence.
// Active runs live here during execution, then get saved to Supabase on done.
const runs = new Map<string, Run>();

// ─── SSE helpers ───────────────────────────────────────────────────────────
function emit(run: Run, type: string, data: Record<string, any>) {
  const event: SSEEvent = { type, data, ts: Date.now() };
  run.events.push(event);
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const sub of run.subscribers) {
    try { sub.write(payload); } catch { }
  }
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

// ─── Apply auth middleware to ALL routes in this router ────────────────────
// Every route below this line requires a valid JWT.
// If the token is missing or invalid, requireAuth returns 401
// and the route handler never runs.
researchRouter.use(requireAuth);

// ─── POST /api/research ────────────────────────────────────────────────────
// requireAuth already ran — req.userId is guaranteed to exist here
researchRouter.post("/", async (req: Request, res: Response) => {
  const { topic } = req.body;

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "topic is required" });
  }

  const runId = randomUUID();
  const run: Run = {
    id: runId,
    userId: req.userId!,   // attached by requireAuth
    topic: topic.trim(),
    status: "pending",
    startedAt: Date.now(),
    events: [],
    subscribers: [],
  };

  runs.set(runId, run);

  // Save initial run to Supabase immediately
  // so it appears in history even before it finishes
  await supabase.from("runs").insert({
    id: runId,
    user_id: req.userId,
    topic: topic.trim(),
    status: "pending",
    started_at: new Date(run.startedAt).toISOString(),
  });

  runPipeline(run).catch((err) => {
    run.status = "error";
    run.error = err.message;
    emit(run, "error", { message: err.message });
  });

  return res.status(202).json({ runId });
});

// ─── GET /api/research/:runId/stream ───────────────────────────────────────
researchRouter.get("/:runId/stream", (req: Request, res: Response) => {
  const run = runs.get(req.params.runId as string);
  if (!run) return res.status(404).json({ error: "Run not found" });

  // Security: users can only stream their own runs
  if (run.userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  sseHeaders(res);

  // Replay buffered events for late joiners
  for (const ev of run.events) {
    res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev.data)}\n\n`);
  }

  if (run.status === "done" || run.status === "error") {
    res.end();
    return;
  }

  run.subscribers.push(res);
  req.on("close", () => {
    run.subscribers = run.subscribers.filter((s) => s !== res);
  });
});

// ─── GET /api/research/:runId/report ───────────────────────────────────────
researchRouter.get("/:runId/report", async (req: Request, res: Response) => {
  // First check in-memory (run might still be active)
  const activeRun = runs.get(req.params.runId as string);
  if (activeRun) {
    if (activeRun.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (activeRun.status !== "done") {
      return res.status(202).json({ status: activeRun.status, message: "Not ready yet" });
    }
    return res.json({ runId: activeRun.id, topic: activeRun.topic, report: activeRun.report });
  }

  // Fall back to Supabase for historical runs
  // RLS ensures users can only fetch their own runs —
  // but we use service role here, so we add user_id check manually
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("id", req.params.runId as string)
    .eq("user_id", req.userId)   // enforce ownership
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Run not found" });
  }

  return res.json({ runId: data.id, topic: data.topic, report: data.report });
});

// ─── GET /api/research/history ─────────────────────────────────────────────
// Fetches from Supabase — persists across server restarts
// Only returns runs belonging to the authenticated user
researchRouter.get("/history", async (req: Request, res: Response) => {
    console.log(req.userId ? `Fetching history for user ${req.userId}` : "No user ID in request");
  const { data, error } = await supabase
    .from("runs")
    .select("id, topic, status, started_at, finished_at")
    .eq("user_id", req.userId)        // only this user's runs
    .order("started_at", { ascending: false })  // newest first
    .limit(50);
console.log("Supabase history query result:", { data, error });
  if (error) {
    return res.status(500).json({ error: "Failed to fetch history" });
  }

  // Normalise to the shape the UI expects
  const history = (data ?? []).map((r: any) => ({
    runId:      r.id,
    topic:      r.topic,
    status:     r.status,
    startedAt:  new Date(r.started_at).getTime(),
    finishedAt: r.finished_at ? new Date(r.finished_at).getTime() : undefined,
  }));

  return res.json(history);
});

// ─── Pipeline runner ────────────────────────────────────────────────────────
async function runPipeline(run: Run) {
  run.status = "running";

  // Update status in Supabase
  await supabase
    .from("runs")
    .update({ status: "running" })
    .eq("id", run.id);

  emit(run, "start", { topic: run.topic, runId: run.id });

  const graph = buildResearchGraph();
  const stream = graph.streamEvents(
    { topic: run.topic, search_attempts: 0, start_time: Date.now(), messages: [] },
    { version: "v2" }
  );

  let finalState: any = null;

  for await (const event of stream) {
    const { event: evType, name, data } = event;

    if (evType === "on_chain_start" && name !== "LangGraph") {
      emit(run, "node_start", { node: name });
    }

    if (evType === "on_chain_end" && name !== "LangGraph") {
      const output = data?.output ?? {};
      emit(run, "node_end", {
        node: name,
        summary: buildNodeSummary(name, output),
      });
      if (output) finalState = { ...finalState, ...output };
    }
  }

  const report = finalState?.final_report;

  if (report) {
    const meta = {
      duration_ms:      Date.now() - run.startedAt,
      summaries_count:  finalState?.summaries?.length ?? 0,
      claims_count:     finalState?.analysis?.claims?.length ?? 0,
      overall_confidence: report.metadata?.overall_confidence ?? 0.7,
    };

    const { jsonPath, mdPath } = await saveReportToDisk(run.topic, report, meta);

    run.report = report;
    run.status = "done";
    run.finishedAt = Date.now();

    // Persist completed run to Supabase
    await supabase
      .from("runs")
      .update({
        status:      "done",
        finished_at: new Date(run.finishedAt).toISOString(),
        report:      report,   // stored as jsonb
        meta:        meta,
      })
      .eq("id", run.id);

    emit(run, "done", {
      duration_ms: meta.duration_ms,
      summaries:   meta.summaries_count,
      claims:      meta.claims_count,
      confidence:  meta.overall_confidence,
      files:       { json: jsonPath, md: mdPath },
    });
  } else {
    const errors = [
      finalState?.summarizer_error,
      finalState?.analyzer_error,
      finalState?.synthesis_error,
      finalState?.reporter_error,
    ].filter(Boolean).join("; ");

    run.status = "error";
    run.error = errors || "Pipeline completed without generating a report";
    run.finishedAt = Date.now();

    // Persist error state to Supabase
    await supabase
      .from("runs")
      .update({
        status:      "error",
        finished_at: new Date(run.finishedAt).toISOString(),
      })
      .eq("id", run.id);

    emit(run, "error", { message: run.error });
  }

  for (const sub of run.subscribers) {
    try { sub.end(); } catch { }
  }
  run.subscribers = [];
}

function buildNodeSummary(node: string, output: any): string {
  switch (node) {
    case "searcher":   return `Found ${output.search_results?.length ?? 0} search responses`;
    case "summarizer": return `Created ${output.summaries?.length ?? 0} summaries`;
    case "analyzer":   return `Extracted ${output.analysis?.claims?.length ?? 0} claims`;
    case "validator":  return `Validated ${output.validations?.length ?? 0} claims`;
    case "synthesizer":
      return output.final_report? "Report generated" : "Report generation failed";
    default: return "Complete";
  }
}