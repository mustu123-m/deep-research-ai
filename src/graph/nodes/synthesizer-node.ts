import { GraphState } from "@/graph/state.js";
import { llm } from "@/config/llm.js";
import { FinalReportSchema } from "@/types/index.js";
import { storeReport } from "@/db/supabase.js";

/**
 * Strip markdown code fences and extract the first JSON object.
 */
function extractJson(raw: string): any | null {
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();
  if (!cleaned.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    cleaned = match[0];
  }
  cleaned = cleaned.replace(/,(\s*[\}\]])/g, "$1");
  cleaned = cleaned.replace(/['']/g, "'").replace(/[""]/g, '"');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function synthesizerNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { topic, summaries, analysis, validations } = state;

  console.log(`\n🧠 Synthesizer Node`);
  console.log(`📌 Synthesizing report from all agent outputs`);

  // ── FIX: never throw — if upstream data is missing/empty, synthesize
  //         whatever we DO have and log warnings instead of crashing. ──

  if (!summaries || summaries.length === 0) {
    const msg = "No summaries available for synthesis";
    console.error("❌ Synthesizer Node Error:", msg);
    return { synthesis_error: msg };
  }

  // Treat missing/null analysis as empty — this happens when analyzer
  // extracted 0 claims (e.g. JSON parse failed upstream)
  const safeAnalysis = analysis ?? {
    claims: [],
    contradictions: [],
    perspectives: { optimistic: [], pessimistic: [], neutral: [] },
  };

  // Treat missing/null validations as empty array
  const safeValidations: any[] = validations ?? [];

  if (safeAnalysis.claims.length === 0) {
    console.warn("⚠️ No claims from analyzer — synthesizing from summaries only");
  }
  if (safeValidations.length === 0) {
    console.warn("⚠️ No validations — synthesizing without fact-check data");
  }

  try {
    /**
     * Step 1: Separate verified vs disputed claims
     */
    const verifiedClaims = safeValidations
      .filter((v: any) => v.is_verified)
      .map((v: any) => ({
        text: v.claim_text,
        confidence: v.confidence,
        sources: v.supporting_sources?.length ?? 0,
      }));

    const disputedClaims = safeValidations
      .filter((v: any) => !v.is_verified)
      .map((v: any) => ({
        text: v.claim_text,
        confidence: v.confidence,
        supporting: v.supporting_sources?.length ?? 0,
        contradicting: v.contradicting_sources?.length ?? 0,
      }));

    /**
     * Step 2: Build a summary-based fallback block for the prompt,
     *         used when claims/validations are absent.
     */
    const summaryBlock = summaries
      .map(
        (s: any, i: number) =>
          `Summary ${i + 1} — ${s.title}:\n${s.key_points
            .map((p: string) => `  • ${p}`)
            .join("\n")}`
      )
      .join("\n\n");

    /**
     * Step 3: Build synthesis prompt
     */
    const verifiedSection =
      verifiedClaims.length > 0
        ? verifiedClaims
            .map(
              (c: any) =>
                `- ${c.text} (${c.sources} sources, ${(c.confidence * 100).toFixed(0)}% confidence)`
            )
            .join("\n")
        : "No individually verified claims — see source summaries below.";

    const disputedSection =
      disputedClaims.length > 0
        ? disputedClaims
            .map(
              (c: any) =>
                `- ${c.text} (${c.supporting} supporting, ${c.contradicting} contradicting, ${(c.confidence * 100).toFixed(0)}% confidence)`
            )
            .join("\n")
        : "No disputed claims identified.";

    const synthesisPrompt = `Create a balanced, comprehensive research report on "${topic}".

VERIFIED CLAIMS (high confidence):
${verifiedSection}

DISPUTED CLAIMS (areas of disagreement):
${disputedSection}

SOURCE SUMMARIES:
${summaryBlock}

PERSPECTIVES IN SOURCES:
- Optimistic: ${safeAnalysis.perspectives.optimistic.length} claims
- Pessimistic: ${safeAnalysis.perspectives.pessimistic.length} claims
- Neutral: ${safeAnalysis.perspectives.neutral.length} claims

CONTRADICTIONS FOUND: ${safeAnalysis.contradictions.length} major disagreements between sources

Create a professional report that:
1. Opens with a balanced introduction
2. Sections for: What We Know (verified), What's Debated (disputed), Different Views
3. Acknowledges uncertainty and disagreement
4. Provides honest conclusions
5. Cites sources throughout

IMPORTANT: Return ONLY valid JSON with NO markdown fences, no \`\`\`json, no extra text:
{
  "topic": "The topic",
  "introduction": "Balanced intro acknowledging both certainty and uncertainty",
  "sections": [
    {
      "heading": "Section title",
      "content": "Detailed balanced content",
      "sources": ["url1", "url2"],
      "confidence": 0.85,
      "notes": "Any important caveats or uncertainties"
    }
  ],
  "consensus": "What most sources agree on",
  "disagreements": "Where sources disagree",
  "conclusion": "Honest conclusion acknowledging what we don't know",
  "overall_confidence": 0.75
}`;

    /**
     * Step 4: Call LLM
     */
    const response = await llm.invoke([
      { role: "user", content: synthesisPrompt },
    ]);

    /**
     * Step 5: Parse response — use extractJson to handle fences
     */
    const content = typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
      ? (response.content as any[])
          .map((b) => (typeof b === "string" ? b : b.text ?? ""))
          .join("")
      : String(response.content);

    const parsed = extractJson(content);

    if (!parsed) {
      const msg = "Failed to parse synthesis response as JSON";
      console.error("❌ Synthesizer Node Error:", msg);
      console.error("   Raw response (first 300 chars):", content.substring(0, 300));
      return { synthesis_error: msg };
    }

    /**
     * Step 6: Validate and create report
     */
    const report = FinalReportSchema.parse({
      topic: parsed.topic || topic,
      introduction: parsed.introduction || "",
      sections: parsed.sections || [],
      conclusion: parsed.conclusion || "",
      sources_cited: Array.from(
        new Set(
          (parsed.sections || [])
            .flatMap((s: any) => s.sources || [])
            .concat(summaries.map((s: any) => s.source_url))
        )
      ),
      generation_time_ms: Date.now() - state.start_time,
    });

    /**
     * Step 7: Attach metadata
     */
    const reportWithMetadata = {
      ...report,
      metadata: {
        verified_claims: verifiedClaims.length,
        disputed_claims: disputedClaims.length,
        overall_confidence: parsed.overall_confidence || 0.7,
        consensus: parsed.consensus,
        disagreements: parsed.disagreements,
        contradictions_found: safeAnalysis.contradictions.length,
        perspective_breakdown: safeAnalysis.perspectives,
      },
    };

    console.log(`✅ Synthesizer Node Complete`);
    console.log(`📄 Created balanced report`);
    console.log(`   Verified: ${verifiedClaims.length} claims`);
    console.log(`   Disputed: ${disputedClaims.length} claims`);
    console.log(
      `   Overall Confidence: ${((parsed.overall_confidence || 0.7) * 100).toFixed(0)}%`
    );

    await storeReport(topic, reportWithMetadata, parsed.overall_confidence || 0.7);

    return {
      final_report: reportWithMetadata,
      synthesis_error: undefined,
    };
  } catch (error) {
    console.error("❌ Synthesizer Node Error:", error);
    return {
      synthesis_error: error instanceof Error ? error.message : String(error),
    };
  }
}