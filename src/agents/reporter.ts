import { z } from "zod";
import { llm } from "../config/llm.ts";
import { FinalReportSchema, Summary } from "../types/index.js";

/**
 * Reporter Agent
 *
 * Takes summaries from the Summarizer and creates a polished report
 * Structures the information into sections
 * Includes citations and conclusion
 */

const reporterPrompt = `You are a professional researcher and writer. Create a well-structured research report.

Topic: {topic}

Available summaries with key points:
{summaries}

Create a comprehensive report that:
1. Opens with a strong introduction
2. Organizes information into logical sections
3. Includes all source URLs as citations
4. Concludes with key takeaways

Make it professional, factual, and well-organized.`;

export async function runReporter(topic: string, summaries: Summary[]) {
  console.log(`\n📖 Reporter Agent Started`);
  console.log(`📌 Creating report from ${summaries.length} summaries\n`);

  const startTime = Date.now();

  try {
    /**
     * Step 1: Prepare summaries for the prompt
     */
    const summariesText = summaries
      .map(
        (s, i) =>
          `Summary ${i + 1} (from ${s.source_url}):\n` +
          `Title: ${s.title}\n` +
          `Key Points:\n` +
          s.key_points.map((p) => `  - ${p}`).join("\n") +
          `\nConfidence: ${(s.confidence * 100).toFixed(0)}%`
      )
      .join("\n\n");

    /**
     * Step 2: Create reporter chain with structured output
     */
    const reporterChain = llm.withStructuredOutput(FinalReportSchema);

    /**
     * Step 3: Invoke the chain
     */
    const prompt = reporterPrompt
      .replace("{topic}", topic)
      .replace("{summaries}", summariesText);

    const report = await reporterChain.invoke(prompt);

    const endTime = Date.now();
    report.generation_time_ms = endTime - startTime;

    console.log(`✅ Reporter Agent Complete`);
    console.log(`⏱️ Total time: ${(report.generation_time_ms / 1000).toFixed(2)}s`);
    console.log(`📄 Report has ${report.sections.length} sections`);

    return report;
  } catch (error) {
    console.error("❌ Reporter Agent Error:", error);
    throw error;
  }
}