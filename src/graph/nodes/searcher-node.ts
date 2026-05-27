import { GraphState } from "@/graph/state.js";
import { llm } from "@/config/llm.js";
import { webSearchTool } from "@/tools/web-search-real.js";
import { HumanMessage } from "@langchain/core/messages";
import { SearchResponseSchema } from "@/types/index.js";

const MAX_SEARCH_ATTEMPTS = 3;

export async function searcherNode(state: GraphState): Promise<Partial<GraphState>> {
  const { topic, search_attempts } = state;

  console.log(`\n📚 Searcher Node - Attempt ${search_attempts + 1}/${MAX_SEARCH_ATTEMPTS}`);
  console.log(`📌 Topic: ${topic}`);

  try {
    const prompt = `You are a research assistant. Generate 2-3 simple search queries to research: "${topic}"

Rules:
- Keep queries short and natural (5-8 words max)
- No quotes or boolean operators
- Write like a human would type into a search engine

Output ONLY valid JSON, no markdown:
{
  "queries": ["query1", "query2", "query3"]
}`;

    const response = await llm.invoke([new HumanMessage(prompt)]);

    let queries = [topic];

    try {
      const content = response.content as string;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        queries = parsed.queries || [topic];
      }
    } catch (e) {
      console.warn("Failed to parse LLM response, using topic as query");
    }

    console.log(`🔍 Generated queries:`, queries);

    const allResults = [];
    for (const query of queries) {
      // Delay between requests to avoid DDG rate limiting
      if (allResults.length > 0) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      try {
        const searchResult = await webSearchTool.invoke({ query, num_results: 5 });
        const parsed = JSON.parse(searchResult);
        const validResults = parsed.results.filter(
  (r: any) => r.url && r.url.startsWith("http")
);

if (validResults.length === 0) {
  console.warn(`No valid results for "${query}", skipping`);
  continue;
}

        allResults.push(
          SearchResponseSchema.parse({
            query,
            results: parsed.results,
            total_results: parsed.results.length,
          })
        );
      } catch (error) {
        console.error(`Failed to search "${query}":`, error);
      }
    }

    if (allResults.length === 0) {
      throw new Error("No search results found");
    }

    console.log(`✅ Searcher Node Complete`);
    console.log(`📊 Found ${allResults.length} search responses`);

    return {
      search_results: allResults,
      search_error: undefined,
      search_attempts: search_attempts + 1,
      messages: [
        ...state.messages,
        new HumanMessage(`Searched for: ${queries.join(", ")}`),
      ],
    };
  } catch (error) {
    console.error("❌ Searcher Node Error:", error);
    return {
      search_error: error instanceof Error ? error.message : String(error),
      search_attempts: search_attempts + 1,
    };
  }
}