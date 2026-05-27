import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env.js";

/**
 * Initialize Supabase client for vector database operations
 * 
 * Why Supabase?
 * - Built-in vector search (pgvector extension)
 * - Can cache search results
 * - Can track confidence scores
 * - Can link sources and claims
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);

/**
 * Create tables for Phase 3
 * 
 * Tables:
 * 1. research_queries - Cache search queries
 * 2. research_results - Cache search results
 * 3. claims - Extract and store claims from sources
 * 4. fact_checks - Track validation of claims
 * 5. research_reports - Final reports
 */

export async function initializeDatabase() {
  console.log("📦 Initializing Supabase tables for Phase 3...\n");

  try {
    // Table 1: Cache search queries to avoid duplicate searches
    await supabase.from("research_queries").select("*").limit(1);
    console.log("✅ research_queries table exists");
  } catch (error) {
    console.log("⚠️ Creating research_queries table...");
    await supabase.rpc("create_research_queries_table");
  }

  try {
    // Table 2: Store search results with embeddings
    await supabase.from("research_results").select("*").limit(1);
    console.log("✅ research_results table exists");
  } catch (error) {
    console.log("⚠️ Creating research_results table...");
    await supabase.rpc("create_research_results_table");
  }

  try {
    // Table 3: Store extracted claims for fact-checking
    await supabase.from("claims").select("*").limit(1);
    console.log("✅ claims table exists");
  } catch (error) {
    console.log("⚠️ Creating claims table...");
    await supabase.rpc("create_claims_table");
  }

  try {
    // Table 4: Track fact-check results
    await supabase.from("fact_checks").select("*").limit(1);
    console.log("✅ fact_checks table exists");
  } catch (error) {
    console.log("⚠️ Creating fact_checks table...");
    await supabase.rpc("create_fact_checks_table");
  }

  try {
    // Table 5: Store final reports
    await supabase.from("research_reports").select("*").limit(1);
    console.log("✅ research_reports table exists\n");
  } catch (error) {
    console.log("⚠️ Creating research_reports table...");
    await supabase.rpc("create_research_reports_table");
  }
}

/**
 * Cache a search result to avoid duplicate searches
 * Returns cached result if found, otherwise null
 */
export async function getCachedSearchResult(query: string) {
  const { data, error } = await supabase
    .from("research_queries")
    .select("id, results")
    .eq("query_normalized", query.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data.results;
}

/**
 * Store a search result in cache
 */
export async function cacheSearchResult(
  query: string,
  results: any,
  metadata: any = {}
) {
  const { error } = await supabase.from("research_queries").insert({
    query,
    query_normalized: query.toLowerCase().trim(),
    results,
    metadata,
    cached_at: new Date().toISOString(),
  });

  if (error) console.error("Cache error:", error);
}

/**
 * Store a claim for fact-checking
 */
export async function storeClaim(
  claim: string,
  source_url: string,
  confidence: number,
  context: string
) {
  const { data, error } = await supabase
    .from("claims")
    .insert({
      claim,
      source_url,
      confidence,
      context,
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("Claim storage error:", error);
    return null;
  }
  return data?.[0];
}

/**
 * Store fact-check result
 */
export async function storeFactCheck(
  claim_id: string,
  is_verified: boolean,
  verification_sources: string[],
  notes: string
) {
  const { error } = await supabase.from("fact_checks").insert({
    claim_id,
    is_verified,
    verification_sources,
    notes,
    created_at: new Date().toISOString(),
  });

  if (error) console.error("Fact-check storage error:", error);
}

/**
 * Store final report
 */
export async function storeReport(
  topic: string,
  report: any,
  confidence_score: number
) {
  const { error } = await supabase.from("research_reports").insert({
    topic,
    report,
    confidence_score,
    created_at: new Date().toISOString(),
  });

  if (error) console.error("Report storage error:", error);
}