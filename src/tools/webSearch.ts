import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { SearchResponseSchema } from "../types/index.js";

/**
 * Web Search Tool
 *
 * This tool is "called" by the LLM when it needs to search for information.
 * The LLM sees the description and schema, then decides to use it if relevant.
 *
 * How it works:
 * 1. LLM decides to call "webSearch" with a query
 * 2. Our function receives the validated query
 * 3. We search and return results
 * 4. LLM sees results and continues reasoning
 */
/**
 * Web Search Tool
 *
 * This tool is "called" by the LLM when it needs to search for information.
 * The LLM sees the description and schema, then decides to use it if relevant.
 *
 * How it works:
 * 1. LLM decides to call "webSearch" with a query
 * 2. Our function receives the validated query
 * 3. We search and return results
 * 4. LLM sees results and continues reasoning
 */
export class WebSearchTool extends Tool {
  name = "webSearch";
  description =
    "Search the web for information about a specific topic. Use this when you need to find current information, facts, or sources on a subject.";

  async _call(query: string): Promise<string> {
    console.log(`🔍 Searching for: "${query}"`);

    /**
     * PHASE 1: Mock data
     * We return fake results so you can test the full pipeline
     * without hitting rate limits or needing real API keys
     */
    const mockResults = {
      query: query,
      results: [
        {
          title: `Result 1 about ${query}`,
          url: "https://example.com/result1",
          snippet: `This is a detailed excerpt about ${query}. It contains relevant information that helps understand the topic.`,
        },
        {
          title: `Result 2 about ${query}`,
          url: "https://example.com/result2",
          snippet: `Another important perspective on ${query}. This source provides complementary insights.`,
        },
        {
          title: `Result 3 about ${query}`,
          url: "https://example.com/result3",
          snippet: `Deep analysis of ${query}. This research shows key findings and data points.`,
        },
      ],
      total_results: 3,
    };

    // Validate the mock data against our schema
    const validated = SearchResponseSchema.parse(mockResults);
    return JSON.stringify(validated);
  }
}

export const webSearchTool = new WebSearchTool();

/**
 * Future: Real DuckDuckGo implementation
 *
 * In Phase 2, we'll replace the mock data with:
 * ```
 * const response = await fetch(
 *   `https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json`
 * );
 * const data = await response.json();
 * // Parse and format for our schema
 * ```
 */