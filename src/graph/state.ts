import { BaseMessage } from "@langchain/core/messages";
import { SearchResponse, Summary } from "@/types/index.js";

export interface GraphState {
  // Input
  topic: string;

  // Searcher output
  search_results?: SearchResponse[];
  search_error?: string;
  search_attempts: number;

  // Summarizer output
  summaries?: Summary[];
  summarizer_error?: string;



  // Phase 3: Analyzer output
  analysis?: {
    claims: Array<{
      text: string;
      perspective: "optimistic" | "pessimistic" | "neutral";
      confidence: number;
      source_url: string;
      evidence: string;
    }>;
    contradictions: Array<{
      claim1: any;
      claim2: any;
      topic: string;
    }>;
    perspectives: {
      optimistic: any[];
      pessimistic: any[];
      neutral: any[];
    };
  };
  analyzer_error?: string;

  // Phase 3: Validator output
  validations?: Array<{
    claim_text: string;
    is_verified: boolean;
    confidence: number;
    supporting_sources: string[];
    contradicting_sources: string[];
    summary: string;
  }>;
  validator_error?: string;

  // Phase 3: Synthesizer output
  final_report?: any;
  synthesis_error?: string;

  // Metadata
  start_time: number;
  messages: BaseMessage[];
}