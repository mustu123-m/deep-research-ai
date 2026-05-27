declare module "duckduckgo-search" {
  export interface SearchResult {
    title?: string;
    no_cache?: string;
    href?: string;
    link?: string;
    body?: string;
    description?: string;
  }

  export interface SearchOptions {
    max_results?: number;
    region?: string;
    safesearch?: "on" | "moderate" | "off";
    timelimit?: string;
  }

  export function search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;

  export default {
    search,
  };
}