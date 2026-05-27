import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";

export const SearchResultSchema = z.object({
  title: z.string().describe("The title of the search result"),
  url: z
    .string()
    .min(1)
    .describe("The URL of the source page"),
  snippet: z
    .string()
    .describe("A brief 1-2 sentence excerpt from the page content"),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  query: z.string().describe("The original search query"),
  results: z
    .array(SearchResultSchema)
    .describe("Array of search results"),
  total_results: z
    .number()
    .describe("Total number of results found"),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const SummarySchema = z.object({
  title: z.string().describe("Main title or topic of the summary"),
  key_points: z
    .array(z.string())
    .describe("Array of 3-5 key points from the source material"),
  source_url: z
    .string()
    .min(1)
    .describe("URL of the source that was summarized"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score (0-1) in the summary accuracy"),
});

export type Summary = z.infer<typeof SummarySchema>;

export const ResearchRequestSchema = z.object({
  topic: z
    .string()
    .min(1)
    .describe("The research topic or question"),
  depth: z
    .enum(["quick", "medium", "deep"])
    .default("medium")
    .describe("How deep to research (affects number of searches)"),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

export const FinalReportSchema = z.object({
  topic: z.string().describe("The research topic"),
  introduction: z
    .string()
    .describe("Brief introduction to the topic"),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        content: z.string(),
        sources: z.array(z.string()),
      })
    )
    .describe("Main sections of the report"),
  conclusion: z
    .string()
    .describe("Summary conclusions"),
  sources_cited: z
    .array(z.string())
    .describe("All sources cited in the report"),
  generation_time_ms: z
    .number()
    .describe("How long the report took to generate"),
});

export type FinalReport = z.infer<typeof FinalReportSchema>;