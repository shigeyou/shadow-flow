import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/azure-openai";
import {
  searchWeb,
  formatSearchResultsForPrompt,
} from "@/lib/tavily-search";

export async function POST(request: NextRequest) {
  try {
    const { theme, requiresSearch, searchQuery, excludeTopics } = await request.json();

    if (!theme || typeof theme !== "string") {
      return NextResponse.json(
        { error: "Theme is required" },
        { status: 400 }
      );
    }

    let searchContext: string | undefined;

    let searchError: string | undefined;

    // Perform web search if theme requires it
    if (requiresSearch && searchQuery) {
      console.log("Searching for:", searchQuery);
      console.log("TAVILY_API_KEY set:", !!process.env.TAVILY_API_KEY);
      const searchResults = await searchWeb(searchQuery);
      console.log("Search results count:", searchResults.results.length);
      console.log("Search answer:", searchResults.answer ? "yes" : "no");
      if (searchResults.error) {
        console.error("Search error:", searchResults.error);
        searchError = searchResults.error;
      }
      searchContext = formatSearchResultsForPrompt(
        searchResults.results,
        searchResults.answer
      );
      console.log("Search context length:", searchContext.length);
    }

    // Pass excludeTopics to avoid duplicate news
    const script = await generateScript(theme, searchContext, {
      sentenceCount: requiresSearch ? 3 : 5,
      excludeTopics: excludeTopics || [],
    });

    // Add debug info in development or when debug param is present
    const url = new URL(request.url);
    if (url.searchParams.get("debug") === "1") {
      return NextResponse.json({
        ...script,
        _debug: {
          requiresSearch,
          searchQuery,
          tavilyKeySet: !!process.env.TAVILY_API_KEY,
          searchContextLength: searchContext?.length || 0,
          searchError,
        },
      });
    }

    return NextResponse.json(script);
  } catch (error) {
    console.error("Error generating script:", error);
    return NextResponse.json(
      { error: "Failed to generate script" },
      { status: 500 }
    );
  }
}
