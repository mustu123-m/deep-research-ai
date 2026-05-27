import { GraphState } from "@/graph/state.js";
import { fastLlm } from "@/config/llm.js";
import { storeClaim } from "@/db/supabase.js";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Claim {
  text: string;
  perspective: "optimistic" | "pessimistic" | "neutral";
  confidence: number;
  source_url: string;
  evidence: string;
}

interface Analysis {
  claims: Claim[];
  contradictions: Array<{
    claim1: Claim;
    claim2: Claim;
    topic: string;
  }>;
  perspectives: {
    optimistic: Claim[];
    pessimistic: Claim[];
    neutral: Claim[];
  };
}

/**
 * Strip markdown code fences and extract the first JSON object from a string.
 * Handles:
 *   - ```json ... ```
 *   - ``` ... ```
 *   - Raw JSON with no fences
 *   - Trailing commas before } or ]
 */
function extractJson(raw: string): any | null {
  // 1. Remove markdown fences (```json ... ``` or ``` ... ```)
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1").trim();

  // 2. If still no pure JSON, fall back to grabbing the first { ... } block
  if (!cleaned.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    cleaned = match[0];
  }

  // 3. Remove trailing commas  e.g.  [1, 2,]  or  {"a": 1,}
  cleaned = cleaned.replace(/,(\s*[\}\]])/g, "$1");

  // 4. Normalise smart/curly quotes → straight quotes
  cleaned = cleaned.replace(/['']/g, "'").replace(/[""]/g, '"');

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function analyzerNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { topic, summaries } = state;

  console.log(`\n🔍 Analyzer Node`);
  console.log(
    `📌 Extracting claims and perspectives from ${summaries?.length || 0} summaries`
  );

  // Guard: no summaries — return error state, do NOT throw
  if (!summaries || summaries.length === 0) {
    const msg = "No summaries to analyze";
    console.error("❌ Analyzer Node Error:", msg);
    return {
      analyzer_error: msg,
      analysis: {
        claims: [],
        contradictions: [],
        perspectives: { optimistic: [], pessimistic: [], neutral: [] },
      },
    };
  }

  const allClaims: Claim[] = [];
  const contradictions: Analysis["contradictions"] = [];

  /**
   * Step 1: Extract claims from each summary
   */
  for (let i = 0; i < summaries.length; i++) {
    const summary = summaries[i];

    if (i > 0) {
      console.log(`⏳ Waiting 6s to respect rate limits...`);
      await sleep(6000);
    }

    console.log(`\n📊 Analyzing summary ${i + 1}: "${summary.title}"`);

    const prompt = `Analyze this research summary about "${topic}":

Title: ${summary.title}
Key Points:
${summary.key_points.map((p: string) => `- ${p}`).join("\n")}

Source: ${summary.source_url}

Extract specific CLAIMS and PERSPECTIVES from the key points above.

IMPORTANT: Return ONLY valid JSON with NO markdown fences, no \`\`\`json, no extra text.

{
  "claims": [
    {
      "text": "Specific claim statement (short, clear statement)",
      "perspective": "optimistic",
      "confidence": 0.85,
      "evidence": "Which key point supports this claim"
    },
    {
      "text": "Another claim",
      "perspective": "pessimistic",
      "confidence": 0.75,
      "evidence": "Supporting evidence"
    },
    {
      "text": "Balanced claim",
      "perspective": "neutral",
      "confidence": 0.90,
      "evidence": "Supporting evidence"
    }
  ]
}

Rules for claims:
- perspective: "optimistic" (positive impact), "pessimistic" (negative impact), or "neutral" (balanced/factual)
- confidence: 0-1, how strongly the source states this
- text: 1-2 sentences max, specific and clear
- evidence: which key point supports this claim
- Extract 3-5 claims per summary`;

    try {
      const response = await fastLlm.invoke([
        { role: "user", content: prompt },
      ]);

      // Normalise Gemini response to string
      let content = "";
      if (typeof response.content === "string") {
        content = response.content;
      } else if (Array.isArray(response.content)) {
        content = response.content
          .map((block: any) =>
            typeof block === "string" ? block : block.text ?? ""
          )
          .join("");
      } else {
        content = String(response.content);
      }

      console.log(
        `   Raw response (first 200 chars): ${content.substring(0, 200)}`
      );

      // ── FIX: use extractJson() which strips fences before parsing ──
      const parsed = extractJson(content);

      if (parsed && Array.isArray(parsed.claims)) {
        console.log(`   ✅ Extracted ${parsed.claims.length} claims`);

        for (const claimData of parsed.claims) {
          if (
            !claimData.text ||
            !claimData.perspective ||
            claimData.confidence === undefined
          ) {
            console.warn(`   ⚠️ Invalid claim structure:`, claimData);
            continue;
          }

          const validPerspectives = ["optimistic", "pessimistic", "neutral"];
          const perspective = validPerspectives.includes(claimData.perspective)
            ? claimData.perspective
            : "neutral";

          const claimObj: Claim = {
            text: claimData.text.trim(),
            perspective: perspective as "optimistic" | "pessimistic" | "neutral",
            confidence: Math.max(0, Math.min(1, claimData.confidence || 0.7)),
            source_url: summary.source_url,
            evidence: claimData.evidence || "",
          };

          allClaims.push(claimObj);
          console.log(
            `      - [${perspective}] ${claimObj.text} (${(claimObj.confidence * 100).toFixed(0)}%)`
          );

          await storeClaim(
            claimObj.text,
            claimObj.source_url,
            claimObj.confidence,
            claimObj.evidence
          );
        }
      } else {
        console.warn(`   ⚠️ No claims array found in parsed response`);
        if (parsed) console.warn(`   Parsed keys:`, Object.keys(parsed));
      }
    } catch (error) {
      console.warn(`❌ Failed to analyze summary ${i + 1}:`, error);
    }
  }

  /**
   * Step 2: Detect contradictions between claims
   */
  if (allClaims.length > 1) {
    console.log(
      `\n🔎 Detecting contradictions between ${allClaims.length} claims...`
    );

    const maxComparisons = Math.min(allClaims.length * 2, 6);
    let comparisonsChecked = 0;

    for (
      let i = 0;
      i < allClaims.length && comparisonsChecked < maxComparisons;
      i++
    ) {
      for (
        let j = i + 1;
        j < allClaims.length && comparisonsChecked < maxComparisons;
        j++
      ) {
        await sleep(4000);
        comparisonsChecked++;

        const claim1 = allClaims[i];
        const claim2 = allClaims[j];

        const checkPrompt = `Do these two claims about "${topic}" contradict each other?

Claim 1: ${claim1.text}
Claim 2: ${claim2.text}

Answer with ONLY one word: YES or NO`;

        try {
          const response = await fastLlm.invoke([
            { role: "user", content: checkPrompt },
          ]);

          const responseText = (response.content as string).toUpperCase().trim();

          if (responseText.includes("YES")) {
            contradictions.push({
              claim1,
              claim2,
              topic: `Disagreement about ${topic}`,
            });
            console.log(`   ⚠️ Contradiction found:`);
            console.log(`      Claim 1: ${claim1.text}`);
            console.log(`      Claim 2: ${claim2.text}`);
          }
        } catch (error) {
          console.warn("   Contradiction check failed:", error);
        }
      }
    }
  }

  /**
   * Step 3: Organise claims by perspective
   */
  const perspectives = {
    optimistic: allClaims.filter((c) => c.perspective === "optimistic"),
    pessimistic: allClaims.filter((c) => c.perspective === "pessimistic"),
    neutral: allClaims.filter((c) => c.perspective === "neutral"),
  };

  console.log(`\n✅ Analyzer Node Complete`);
  console.log(
    `📊 Extracted ${allClaims.length} claims (${perspectives.optimistic.length} optimistic, ${perspectives.pessimistic.length} pessimistic, ${perspectives.neutral.length} neutral)`
  );
  console.log(`⚠️ Found ${contradictions.length} contradictions`);

  return {
    analysis: {
      claims: allClaims,
      contradictions,
      perspectives,
    },
  };
}