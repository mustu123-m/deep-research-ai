import { useState, useCallback } from "react";
import { startRun, fetchReport } from "@/lib/api";
import { useSSE } from "./useSSE";
import type { Step, RunStatus, RunMeta, Report } from "@/types";

const NODE_META: Record<string, { label: string; icon: string }> = {
  searcher:    { label: "Searcher",    icon: "search"  },
  summarizer:  { label: "Summarizer",  icon: "list"    },
  analyzer:    { label: "Analyzer",    icon: "cpu"     },
  validator:   { label: "Validator",   icon: "check"   },
  synthesizer: { label: "Synthesizer", icon: "layers"  },
};

const NODE_ORDER = [
  "searcher", "summarizer", "analyzer",
  "validator", "synthesizer",
];

function makeSteps(): Step[] {
  return NODE_ORDER.map((node) => ({
    node,
    label:   NODE_META[node]?.label ?? node,
    icon:    NODE_META[node]?.icon  ?? "circle",
    state:   "pending",
    summary: "Waiting...",
  }));
}

export function useResearch() {
  const [runId,   setRunId]   = useState<string | null>(null);
  const [status,  setStatus]  = useState<RunStatus>("pending");
  const [steps,   setSteps]   = useState<Step[]>(makeSteps());
  const [meta,    setMeta]    = useState<RunMeta | null>(null);
  const [report,  setReport]  = useState<Report | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateStep = useCallback(
    (node: string, state: Step["state"], summary: string) => {
      setSteps((prev) =>
        prev.map((s) => (s.node === node ? { ...s, state, summary } : s))
      );
    },
    []
  );

  useSSE(runId, {
    onStart: () => {
      setStatus("running");
    },

    onNodeStart: ({ node }) => {
      updateStep(node, "running", "Running...");
    },

    onNodeEnd: ({ node, summary }) => {
      updateStep(node, "done", summary ?? "Complete");
    },

    onDone: async (data) => {
      setMeta(data);
      setStatus("done");
      setLoading(false);
      try {
        // runId is captured via closure — read directly from state setter
        setRunId((id) => {
          if (id) {
            fetchReport(id)
              .then(setReport)
              .catch((err) => setError(err.message));
          }
          return id;
        });
      } catch (err: any) {
        setError(err.message);
      }
    },

    onError: ({ message }) => {
      setError(message);
      setStatus("error");
      setLoading(false);
    },
  });

  const run = useCallback(async (topic: string) => {
    // Reset all state
    setLoading(true);
    setError(null);
    setReport(null);
    setMeta(null);
    setStatus("pending");
    setSteps(makeSteps());
    setRunId(null);

    try {
      const id = await startRun(topic);
      setRunId(id);
      // loading stays true until onDone or onError fires
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setRunId(null);
    setStatus("pending");
    setSteps(makeSteps());
    setMeta(null);
    setReport(null);
    setError(null);
    setLoading(false);
  }, []);

  return { run, reset, runId, status, steps, meta, report, error, loading };
}