import { END, StateGraph } from "@langchain/langgraph";
import { GraphState } from "@/graph/state.js";
import { searcherNode } from "@/graph/nodes/searcher-node.js";
import { summarizerNode } from "@/graph/nodes/summarizer-node.js";
import { analyzerNode } from "@/graph/nodes/analyzer-node.js";
import { validatorNode } from "@/graph/nodes/validator-node.js";
import { synthesizerNode } from "@/graph/nodes/synthesizer-node.js";

export function buildResearchGraph() {
  const graph = new StateGraph<GraphState>({
    channels: {
      topic: { value: null, default: "" },
      search_results: { value: null, default: [] },
      search_error: { value: null, default: undefined },
      search_attempts: { value: null, default: 0 },
      summaries: { value: null, default: [] },
      summarizer_error: { value: null, default: undefined },
      analysis: { value: null, default: undefined },
      analyzer_error: { value: null, default: undefined },
      validations: { value: null, default: [] },
      validator_error: { value: null, default: undefined },
      report: { value: null, default: undefined },
reporter_error: { value: null, default: undefined },
      synthesis_error: { value: null, default: undefined },
      start_time: { value: null, default: Date.now() },
      messages: { value: null, default: [] },
    },
  });

  graph.addNode("searcher", searcherNode);
  graph.addNode("summarizer", summarizerNode);
  graph.addNode("analyzer", analyzerNode);
  graph.addNode("validator", validatorNode);
  graph.addNode("synthesizer", synthesizerNode);

  // START -> SEARCHER
  graph.addEdge("__start__", "searcher");

  // ─── SEARCHER -> SUMMARIZER (with retry) ───────────────────────────────────
  // FIX: map must include every string the routing fn can return,
  //      including "__end__". Use the imported END constant as the value.
  graph.addConditionalEdges(
    "searcher",
    (state: GraphState): string => {
      if (state.search_results && state.search_results.length > 0) {
        return "summarizer";
      } else if (state.search_attempts < 3) {
        return "searcher";
      } else {
        return "__end__";
      }
    },
    {
      summarizer: "summarizer",
      searcher: "searcher",
      __end__: END,           // ← was missing; caused "unknown destination"
    }
  );

  // ─── SUMMARIZER -> ANALYZER ────────────────────────────────────────────────
  // FIX: map must include "__end__" for the error / empty-summaries path
  graph.addConditionalEdges(
    "summarizer",
    (state: GraphState): string => {
      if (state.summaries && state.summaries.length > 0) {
        return "analyzer";
      } else {
        return "__end__";
      }
    },
    {
      analyzer: "analyzer",
      __end__: END,           // ← was missing
    }
  );

  // ─── ANALYZER -> VALIDATOR or SYNTHESIZER ──────────────────────────────────
  // FIX: map must include "__end__" for the fallthrough path
  graph.addConditionalEdges(
    "analyzer",
    (state: GraphState): string => {
      if (
        state.analysis &&
        state.analysis.claims &&
        state.analysis.claims.length > 0
      ) {
        return "validator";
      } else if (state.summaries && state.summaries.length > 0) {
        console.log(
          "⚠️ Skipping validator (no claims to validate), going to synthesizer"
        );
        return "synthesizer";
      } else {
        return "__end__";
      }
    },
    {
      validator: "validator",
      synthesizer: "synthesizer",
      __end__: END,           // ← was missing
    }
  );

  // ─── VALIDATOR -> SYNTHESIZER ──────────────────────────────────────────────
  // FIX: map must include "__end__" for the no-summaries fallback
  graph.addConditionalEdges(
    "validator",
    (state: GraphState): string => {
      if (state.summaries && state.summaries.length > 0) {
        return "synthesizer";
      } else {
        return "__end__";
      }
    },
    {
      synthesizer: "synthesizer",
      __end__: END,           // ← was missing
    }
  );

  // SYNTHESIZER -> END
  graph.addEdge("synthesizer", "__end__");

  return graph.compile();
}