import { describe, it, expect } from "vitest";
import { PRESET_THEMES, Theme } from "@/types";

describe("PRESET_THEMES", () => {
  it("should have basic themes without search requirement", () => {
    const basicThemes = PRESET_THEMES.filter((t) => !t.requiresSearch);
    expect(basicThemes.length).toBeGreaterThan(0);

    basicThemes.forEach((theme) => {
      expect(theme.id).toBeTruthy();
      expect(theme.name).toBeTruthy();
      expect(theme.nameJa).toBeTruthy();
      expect(theme.description).toBeTruthy();
      expect(theme.requiresSearch).toBeFalsy();
    });
  });

  it("should have exactly 12 search-based themes", () => {
    const searchThemes = PRESET_THEMES.filter((t) => t.requiresSearch);
    expect(searchThemes.length).toBe(12);
  });

  it("search themes should have searchQuery defined", () => {
    const searchThemes = PRESET_THEMES.filter((t) => t.requiresSearch);

    searchThemes.forEach((theme) => {
      expect(theme.searchQuery).toBeTruthy();
      expect(theme.searchQuery!.length).toBeGreaterThan(0);
    });
  });

  it("all themes should have unique IDs", () => {
    const ids = PRESET_THEMES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should include both global and Japan themes for major categories", () => {
    const searchThemes = PRESET_THEMES.filter((t) => t.requiresSearch);
    const ids = searchThemes.map((t) => t.id);

    // Check for paired themes
    expect(ids).toContain("ai-global");
    expect(ids).toContain("ai-japan");
    expect(ids).toContain("tech-global");
    expect(ids).toContain("tech-japan");
    expect(ids).toContain("economy-global");
    expect(ids).toContain("economy-japan");
    expect(ids).toContain("startup-global");
    expect(ids).toContain("startup-japan");
  });
});
