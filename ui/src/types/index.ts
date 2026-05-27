export type RunStatus = "pending" | "running" | "done" | "error";
export type StepState = "pending" | "running" | "done" | "error";

export interface Step {
  node: string;
  label: string;
  icon: string;
  state: StepState;
  summary: string;
}

export interface RunMeta {
  duration_ms: number;
  summaries: number;
  claims: number;
  confidence: number;
  files?: { json: string; md: string };
}

export interface ReportSection {
  heading: string;
  content: string;
  sources?: string[];
  notes?: string;
  confidence?: number;
}

export interface Report {
  topic: string;
  introduction: string;
  sections: ReportSection[];
  conclusion: string;
  sources_cited: string[];
  generation_time_ms?: number;
  metadata?: {
    overall_confidence: number;
    verified_claims: number;
    disputed_claims: number;
    consensus?: string;
    disagreements?: string;
    contradictions_found: number;
  };
}

export interface HistoryRun {
  runId: string;
  topic: string;
  status: RunStatus;
  startedAt: number;
  finishedAt?: number;
}

export interface SSENodeStart { node: string; }
export interface SSENodeEnd   { node: string; summary: string; }
export interface SSEDone      extends RunMeta {}
export interface SSEError     { message: string; }