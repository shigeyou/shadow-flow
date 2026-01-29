const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface TavilySearchResponse {
  results: SearchResult[];
  answer?: string;
}

export async function searchWeb(query: string): Promise<TavilySearchResponse> {
  if (!TAVILY_API_KEY) {
    console.warn("TAVILY_API_KEY is not set, returning empty results");
    return { results: [] };
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    console.error("Tavily search error:", response.status);
    return { results: [] };
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

  let context = "Based on the latest information from the internet:\n\n";

  if (answer) {
    context += `Summary: ${answer}\n\n`;
  }

  if (results.length > 0) {
    context += "Key points from recent sources:\n";
    results.forEach((result, index) => {
      context += `${index + 1}. ${result.title}: ${result.content.slice(0, 200)}...\n`;
    });
  }

  return context;
}
