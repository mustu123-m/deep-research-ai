import { z } from "zod";
import { fastLlm } from "../config/llm.js";
import { SummarySchema, SearchResponse } from "../types/index.js";

/**
 * Summarizer Agent
 *
 * Takes raw search results and creates concise, structured summaries
 * Extracts:
 * - Key points
 * - Main ideas
 * - Confidence in the information
 */

const summarizerPrompt = `You are an expert summarizer. Your job is to extract the most important information.

From the following search results about "{topic}", create a structured summary that:
1. Identifies the 3-5 most important points
2. Evaluates confidence in the information (0-1 scale)
3. Preserves the source URL

Be concise but thorough. Focus on factual information.

Search Results:
{results}`;

export async function runSummarizer(
  topic: string,
  searchResults: SearchResponse[]
) {
  console.log(`\n📝 Summarizer Agent Started`);
  console.log(`📌 Summarizing ${searchResults.length} search responses\n`);

  try {
    /**
     * Step 1: Prepare the results for the LLM
     * Format search results as readable text
     */
    const resultsText = searchResults
      .map((sr) =>
        sr.results
          .map(
            (r) =>
              `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`
          )
          .join("\n---\n")
      )
      .join("\n===\n");

    /**
     * Step 2: Create the summarizer chain with structured output
     * Uses fastLlm (gpt-3.5-turbo) since this is a simpler task
     */
    const summarizerChain = fastLlm.withStructuredOutput(SummarySchema);

    /**
     * Step 3: Prepare and invoke the prompt
     */
    const prompt = summarizerPrompt
      .replace("{topic}", topic)
      .replace("{results}", resultsText);

    const summary = await summarizerChain.invoke(prompt);

    console.log(`✅ Summarizer Agent Complete`);
    console.log(`📊 Generated ${summary.key_points.length} key points`);
    console.log(`💯 Confidence: ${(summary.confidence * 100).toFixed(0)}%`);

    return summary;
  } catch (error) {
    console.error("❌ Summarizer Agent Error:", error);
    throw error;
  }
}