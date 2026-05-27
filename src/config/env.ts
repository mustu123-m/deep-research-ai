import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

const envSchema = z.object({
  GOOGLE_API_KEY: z
    .string()
    .min(1, "GOOGLE_API_KEY is required")
    .describe("Google Gemini API key"),

  LANGSMITH_API_KEY: z
    .string()
    .min(1, "LANGSMITH_API_KEY is required")
    .describe("LangSmith API key for tracing"),

  LANGSMITH_PROJECT: z
    .string()
    .min(1, "LANGSMITH_PROJECT is required")
    .describe("LangSmith project name"),

  LANGSMITH_TRACING: z
    .string()
    .default("true")
    .transform((val) => val === "true")
    .describe("Enable LangSmith tracing"),

  SUPABASE_URL: z
    .string()
    .min(1, "SUPABASE_URL is required")
    .describe("Supabase project URL"),

  SUPABASE_ANON_KEY: z
    .string()
    .min(1, "SUPABASE_ANON_KEY is required")
    .describe("Supabase anonymous key"),

  // Changed from optional() to required — auth middleware won't work without it
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required — get it from Supabase Dashboard → Settings → API")
    .describe("Supabase service role key — server-side only, never expose to browser"),

  DUCKDUCKGO_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true")
    .describe("Enable DuckDuckGo web search"),

  OPENAI_API_KEY: z
    .string()
    .optional()
    .describe("OpenAI API key (optional)"),
});

// If any required variable is missing, this throws immediately at startup
// with a clear error message telling you exactly which variable is missing
export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;