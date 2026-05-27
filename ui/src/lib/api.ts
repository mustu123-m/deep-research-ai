import { supabase } from "./supabase";
import type { HistoryRun, Report } from "@/types";

const BASE = "https://deep-research-ai-qmln.onrender.com/api/research";

/**
 * Get the JWT token from the current Supabase session.
 * This token is sent in the Authorization header on every API request.
 * The Express API verifies this token in requireAuth middleware.
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

export async function startRun(topic: string): Promise<string> {
  const headers = await getAuthHeader();
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ topic }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to start run");
  return data.runId as string;
}

export async function fetchReport(runId: string): Promise<Report> {
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/${runId}/report`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to fetch report");
  return data.report as Report;
}

export async function fetchHistory(): Promise<HistoryRun[]> {
  console.log("Fetching history from API...");
  const headers = await getAuthHeader();
  const res = await fetch(`${BASE}/history`, { headers });
  const data = await res.json();
  console.log("History response:", data);
  if (!res.ok) throw new Error("Failed to fetch history");
  return data;
}

/**
 * EventSource doesn't support custom headers natively.
 * We append the token as a query parameter instead.
 * The API reads it from req.query.token if Authorization header is missing.
 */
export async function createEventSource(runId: string): Promise<EventSource> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return new EventSource(`${BASE}/${runId}/stream?token=${token}`);
}