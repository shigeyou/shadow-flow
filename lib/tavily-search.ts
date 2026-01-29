export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface TavilySearchResponse {
  results: SearchResult[];
  answer?: string;
  error?: string;
}

export async function searchWeb(query: string): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.warn("TAVILY_API_KEY is not set, returning empty results");
    return { results: [] };
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Tavily search error:", response.status, errorText);
    return { results: [], error: `${response.status}: ${errorText}` };
  }

  const data = await response.json();
  return {
    results: data.results || [],
    answer: data.answer,
  };
}

export function formatSearchResultsForPrompt(
  results: SearchResult[],
  answer?: string
): string {
  if (results.length === 0 && !answer) {
    return "";
  }

  let context = "=== LATEST NEWS AND INFORMATION (USE THESE SPECIFIC DETAILS) ===\n\n";

  if (answer) {
    context += `Overview: ${answer}\n\n`;
  }

  if (results.length > 0) {
    context += "Specific news items to reference:\n\n";
    results.forEach((result, index) => {
      context += `[Article ${index + 1}] ${result.title}\n${result.content}\n\n`;
    });
  }

  context += "=== END OF NEWS ===\n";

  return context;
}
