import { GraphState } from "@/graph/state.js";
import { fastLlm } from "@/config/llm.js";
import { Summary, SummarySchema } from "@/types/index.js";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Robustly extract and parse the first JSON object from an LLM response.
 * Handles:
 *  - BOM / zero-width characters before the opening brace
 *  - ```json ... ``` markdown fences
 *  - Curly / smart quotes  " "  ' '
 *  - Trailing commas before } or ]
 */
function extractJson(raw: string): any | null {
  // 1. Strip BOM and common zero-width characters
  let cleaned = raw.replace(/^[\uFEFF\u200B\u200C\u200D\u00A0]+/, "");

  // 2. Strip markdown fences  ```json ... ```  or  ``` ... ```
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();

  // 3. Normalise curly / smart quotes to straight quotes
  cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

  // 4. Find the first { ... } block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let jsonStr = match[0];

  // 5. Remove trailing commas  e.g. [1, 2,]  or  {"a": 1,}
  jsonStr = jsonStr.replace(/,(\s*[\}\]])/g, "$1");

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function summarizerNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { topic, search_results } = state;

  console.log(`\n📝 Summarizer Node`);
  console.log(`📌 Processing ${search_results?.length || 0} search results`);

  if (!search_results || search_results.length === 0) {
    const msg = "No search results to summarize";
    console.error("❌ Summarizer Node Error:", msg);
    return { summarizer_error: msg };
  }

  const summaries: Summary[] = [];

  for (let i = 0; i < search_results.length; i++) {
    const sr = search_results[i];

    if (i > 0) {
      console.log(`⏳ Waiting 6s to respect rate limits...`);
      await sleep(6000);
    }

    const resultsText = sr.results
      .map((r) => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
      .join("\n---\n");

    const prompt = `Summarize these search results about "${topic}":

${resultsText}

Extract:
1. 3-5 key points
2. Confidence level (0-1)
3. The most relevant source URL from the results above

IMPORTANT: Return ONLY valid JSON with NO markdown fences, no \`\`\`json, no extra text before or after:
{
  "title": "Summary title",
  "key_points": ["point1", "point2", "point3"],
  "confidence": 0.8,
  "source_url": "https://actual-url-from-results.com/page"
}`;

    try {
      const response = await fastLlm.invoke([
        { role: "user", content: prompt },
      ]);

      const raw =
        typeof response.content === "string"
          ? response.content
          : Array.isArray(response.content)
          ? response.content
              .map((block: any) =>
                typeof block === "string" ? block : block.text ?? ""
              )
              .join("")
          : String(response.content);

      // Debug: show first 300 chars and char codes of first 5 chars
      console.log(`🔍 Raw result ${i + 1} (first 300):`, raw.substring(0, 300));
      console.log(`🔍 First 5 char codes:`, [...raw.substring(0, 5)].map(c => c.charCodeAt(0)));

      const parsed = extractJson(raw);

      if (!parsed) {
        console.error(`❌ extractJson returned null for result ${i + 1}. Full raw:`, raw);
        continue;
      }

      const firstRealUrl =
        sr.results.find(
          (r) => r.url && !r.url.startsWith("https://example.com")
        )?.url ?? sr.results[0]?.url ?? "https://example.com/research";

      const sourceUrl =
        parsed.source_url &&
        !parsed.source_url.startsWith("https://example.com")
          ? parsed.source_url
          : firstRealUrl;

      summaries.push(
        SummarySchema.parse({
          title: parsed.title || `Summary ${i + 1}`,
          key_points: parsed.key_points || [],
          confidence: parsed.confidence || 0.7,
          source_url: sourceUrl,
        })
      );

      console.log(`✅ Summary ${i + 1} created: "${parsed.title}"`);
    } catch (error) {
      console.error(
        `❌ Failed to summarize result ${i + 1}:`,
        error instanceof Error ? `${error.message}\n${error.stack}` : error
      );
    }
  }

  if (summaries.length === 0) {
    const msg = "Failed to create any summaries";
    console.error("❌ Summarizer Node Error:", msg);
    return { summarizer_error: msg };
  }

  console.log(`✅ Summarizer Node Complete`);
  console.log(`📊 Created ${summaries.length} summaries`);

  return {
    summaries,
    summarizer_error: undefined,
  };
}