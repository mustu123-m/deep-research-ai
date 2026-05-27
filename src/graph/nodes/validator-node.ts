import { GraphState } from "@/graph/state.js";
import { llm } from "@/config/llm.js";
import { webSearchTool } from "@/tools/web-search-real.js";
import { storeFactCheck } from "@/db/supabase.js";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ValidationResult {
  claim_text: string;
  is_verified: boolean;
  confidence: number;
  supporting_sources: string[];
  contradicting_sources: string[];
  summary: string;
}

export async function validatorNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { topic, analysis } = state;

  console.log(`\n✅ Validator Node`);
  console.log(`📌 Fact-checking ${analysis?.claims?.length || 0} claims`);

  try {
    if (!analysis || !analysis.claims || analysis.claims.length === 0) {
      console.log(`⏭️ No claims to validate, skipping`);
      return {};
    }

    const validationResults: ValidationResult[] = [];
    let claimIndex = 0;

    for (const claim of analysis.claims) {
      // Add 8 second delay between claims (conservative for validator)
      if (claimIndex > 0) {
        console.log(`⏳ Waiting 8s to respect rate limits...`);
        await sleep(8000);
      }
      claimIndex++;

      console.log(
        `\n🔬 Validating [${claimIndex}/${analysis.claims.length}]: "${claim.text.substring(0, 50)}..."`
      );

      try {
        const verificationPrompt = `Generate 2 search queries to verify this claim about "${topic}":

Claim: "${claim.text}"

Return ONLY JSON:
{
  "queries": ["query1", "query2"]
}

Make queries specific and likely to find relevant evidence.`;

        const queryResponse = await llm.invoke([
          { role: "user", content: verificationPrompt },
        ]);

        let verificationQueries = [claim.text];
        try {
          const content = queryResponse.content as string;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            verificationQueries = parsed.queries || [claim.text];
          }
        } catch (e) {
          // Use default
        }

        console.log(`   🔍 Searching with queries:`, verificationQueries);

        const supportingSources: string[] = [];
        const contradictingSources: string[] = [];

        for (const query of verificationQueries) {
          try {
            const searchResult = await webSearchTool.invoke({
              query,
              num_results: 2, // Reduce from 3 to 2 to save API calls
            });

            // Add 5 second delay between search calls
            await sleep(5000);

            const parsed = JSON.parse(searchResult);

            for (const result of parsed.results) {
              const evaluationPrompt = `Does this source support or contradict the claim?

Claim: "${claim.text}"
Source Title: "${result.title}"
Source Snippet: "${result.snippet}"

Answer ONLY: "SUPPORTS" or "CONTRADICTS" or "NEUTRAL"`;

              try {
                const evalResponse = await llm.invoke([
                  { role: "user", content: evaluationPrompt },
                ]);

                // Add delay between evaluations
                await sleep(2000);

                const evalText = (evalResponse.content as string).toUpperCase();

                if (evalText.includes("SUPPORTS")) {
                  supportingSources.push(result.url);
                  console.log(`      ✅ Supporting: ${result.title}`);
                } else if (evalText.includes("CONTRADICTS")) {
                  contradictingSources.push(result.url);
                  console.log(`      ❌ Contradicts: ${result.title}`);
                }
              } catch (error) {
                console.warn("      Evaluation failed:", error);
              }
            }
          } catch (error) {
            console.warn(`   Failed to search "${query}":`, error);
          }
        }

        let confidenceScore: number;
        const totalEvidence = supportingSources.length + contradictingSources.length;

        if (totalEvidence === 0) {
          confidenceScore = claim.confidence;
        } else {
          confidenceScore = supportingSources.length / totalEvidence;
        }

        const isVerified =
          supportingSources.length > 0 || confidenceScore >= 0.6;

        const result: ValidationResult = {
          claim_text: claim.text,
          is_verified: isVerified,
          confidence: confidenceScore,
          supporting_sources: supportingSources,
          contradicting_sources: contradictingSources,
          summary: `${supportingSources.length} supporting sources, ${contradictingSources.length} contradicting`,
        };

        validationResults.push(result);

        await storeFactCheck(
          claim.text,
          isVerified,
          supportingSources,
          result.summary
        );

        console.log(
          `   Result: ${isVerified ? "✅ VERIFIED" : "❌ UNVERIFIED"} (${confidenceScore.toFixed(2)} confidence)`
        );
      } catch (error) {
        console.error(`Failed to validate claim:`, error);
      }
    }

    console.log(`\n✅ Validator Node Complete`);
    console.log(`📊 Validated ${validationResults.length} claims`);

    const verified = validationResults.filter((r) => r.is_verified).length;
    console.log(
      `   ${verified}/${validationResults.length} claims verified (${((verified / validationResults.length) * 100).toFixed(0)}%)`
    );

    return {
      validations: validationResults,
    };
  } catch (error) {
    console.error("❌ Validator Node Error:", error);
    return {
      validator_error: error instanceof Error ? error.message : String(error),
    };
  }
}