import { createClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client.
 * Uses the ANON key — safe to expose in the browser.
 * The anon key can only do what RLS policies allow.
 *
 * This client is used for:
 * - Auth (login, signup, signout, session management)
 * - NOT for DB queries (we go through our Express API for that)
 */
export const supabase = createClient(
  (import.meta as any).env.VITE_SUPABASE_URL,
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY
);