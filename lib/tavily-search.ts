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

  // Add current date to query for better recency
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const enhancedQuery = `${query} ${dateStr}`;

  console.log("Enhanced search query:", enhancedQuery);

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: enhancedQuery,
      search_depth: "advanced", // Use advanced for better results
      include_answer: true,
      max_results: 5,
      days: 2, // Only get results from last 48 hours
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
