import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "./env.js";

/**
 * Create and configure the Google Gemini LLM instance
 *
 * Key parameters:
 * - model: "gemini-pro" = latest Gemini model
 * - temperature: 0.7 = balanced creativity vs consistency
 *   (0 = deterministic, 1 = very creative)
 * - maxOutputTokens: 2048 = max output length
 *
 * LangSmith magic:
 * When LANGSMITH_API_KEY is set in environment, LangChain
 * automatically sends all LLM calls to LangSmith for tracing.
 * No callbacks or extra setup needed!
 */
export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  apiKey: env.GOOGLE_API_KEY,
  temperature: 0.7,
  maxOutputTokens: 8192,
});

/**
 * Fast LLM for quick tasks (e.g., summarization)
 * Uses same model but lower temperature for focused responses
 */
export const fastLlm = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  apiKey: env.GOOGLE_API_KEY,
  temperature: 0.3,
  maxOutputTokens: 2048,
});
