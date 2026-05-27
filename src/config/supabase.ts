import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Initialize Supabase client
 * We'll use this in Phase 2 to store and retrieve vector embeddings
 *
 * Supabase is a PostgreSQL database with pgvector extension
 * Perfect for storing research data with semantic search
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

/**
 * Test Supabase connection
 * Call this in main() to verify setup is correct
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("⚠️ Supabase connection warning (ok for Phase 1):", error.message);
      return false;
    }
    console.log("✅ Supabase connected");
    return true;
  } catch (error) {
    console.warn("⚠️ Supabase unavailable (ok for Phase 1)");
    return false;
  }
}