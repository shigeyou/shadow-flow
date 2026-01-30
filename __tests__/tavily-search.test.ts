import { describe, it, expect } from "vitest";
import { formatSearchResultsForPrompt, SearchResult } from "@/lib/tavily-search";

describe("formatSearchResultsForPrompt", () => {
  it("should return empty string when no results and no answer", () => {
    const result = formatSearchResultsForPrompt([], undefined);
    expect(result).toBe("");
  });

  it("should include answer when provided", () => {
    const result = formatSearchResultsForPrompt([], "This is the answer");
    expect(result).toContain("Overview: This is the answer");
  });

  it("should format search results correctly", () => {
    const results: SearchResult[] = [
      {
        title: "Test Article 1",
        url: "https://example.com/1",
        content: "Content of article 1",
      },
      {
        title: "Test Article 2",
        url: "https://example.com/2",
        content: "Content of article 2",
      },
    ];

    const formatted = formatSearchResultsForPrompt(results);

    expect(formatted).toContain("[Article 1] Test Article 1");
    expect(formatted).toContain("Content of article 1");
    expect(formatted).toContain("[Article 2] Test Article 2");
    expect(formatted).toContain("Content of article 2");
  });

  it("should include header and footer markers", () => {
    const results: SearchResult[] = [
      {
        title: "Test",
        url: "https://example.com",
        content: "Content",
      },
    ];

    const formatted = formatSearchResultsForPrompt(results);

    expect(formatted).toContain("=== LATEST NEWS AND INFORMATION");
    expect(formatted).toContain("=== END OF NEWS ===");
  });

  it("should handle both answer and results together", () => {
    const results: SearchResult[] = [
      {
        title: "Article",
        url: "https://example.com",
        content: "Article content",
      },
    ];

    const formatted = formatSearchResultsForPrompt(results, "Summary answer");

    expect(formatted).toContain("Overview: Summary answer");
    expect(formatted).toContain("[Article 1] Article");
    expect(formatted).toContain("Article content");
  });
});
