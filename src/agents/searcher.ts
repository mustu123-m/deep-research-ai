import { z } from "zod";
import { llm } from "../config/llm.ts";
import { webSearchTool } from "../tools/webSearch.ts";
import { SearchResponseSchema } from "../types/index.ts";
import { HumanMessage } from "@langchain/core/messages";

/**
 * Searcher Agent - Phase 1 Simplified
 *
 * For Phase 1, we'll keep this simple:
 * Just call the web search tool and return results
 */

export async function runSearcher(topic: string) {
  console.log(`\n📚 Searcher Agent Started`);
  console.log(`📌 Topic: ${topic}\n`);

  try {
    /**
     * Step 1: Create a simple prompt message
     */
    const prompt = `You are a research assistant. The user wants you to search for information about: "${topic}"
    
Use the webSearch tool to find relevant information.`;

    /**
     * Step 2: Call the LLM with the tool using HumanMessage
     */
    const response = await llm.invoke([
      new HumanMessage(prompt),
    ]);

    console.log(`✅ Searcher Agent Complete`);
    console.log(`📊 Results received\n`);

    /**
     * Step 3: Return mock structured data
     * In Phase 2, we'll parse the actual LLM response
     */
    const mockSearchResponse = {
      reasoning: `Searching for comprehensive information about: ${topic}`,
      search_results: [
        SearchResponseSchema.parse({
          query: topic,
          results: [
            {
              title: `Overview of ${topic}`,
              url: "https://example.com/overview",
              snippet: `A comprehensive overview of ${topic}. This source provides foundational information and key concepts related to the topic.`,
            },
            {
              title: `Current trends in ${topic}`,
              url: "https://example.com/trends",
              snippet: `Analysis of current trends and developments in ${topic}. This source provides recent data and insights.`,
            },
            {
              title: `Future implications of ${topic}`,
              url: "https://example.com/implications",
              snippet: `Discussion of the implications and future outlook for ${topic}. This source provides expert perspectives and forecasts.`,
            },
          ],
          total_results: 3,
        }),
      ],
    };

    return mockSearchResponse;
  } catch (error) {
    console.error("❌ Searcher Agent Error:", error);
    throw error;
  }
}