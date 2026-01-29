import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/azure-openai";
import {
  searchWeb,
  formatSearchResultsForPrompt,
} from "@/lib/tavily-search";

export async function POST(request: NextRequest) {
  try {
    const { theme, requiresSearch, searchQuery } = await request.json();

    if (!theme || typeof theme !== "string") {
      return NextResponse.json(
        { error: "Theme is required" },
        { status: 400 }
      );
    }

    let searchContext: string | undefined;

    // Perform web search if theme requires it
    if (requiresSearch && searchQuery) {
      console.log("Searching for:", searchQuery);
      console.log("TAVILY_API_KEY set:", !!process.env.TAVILY_API_KEY);
      const searchResults = await searchWeb(searchQuery);
      console.log("Search results count:", searchResults.results.length);
      console.log("Search answer:", searchResults.answer ? "yes" : "no");
      searchContext = formatSearchResultsForPrompt(
        searchResults.results,
        searchResults.answer
      );
      console.log("Search context length:", searchContext.length);
    }

    const script = await generateScript(theme, searchContext);

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
