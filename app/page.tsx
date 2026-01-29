"use client";

import { useState, useCallback } from "react";
import { ThemeSelector } from "@/components/theme-selector";
import { PracticeView } from "@/components/practice-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Script, Theme, PRESET_THEMES } from "@/types";
import { Headphones } from "lucide-react";

const SEARCH_THEMES = PRESET_THEMES.filter((t) => t.requiresSearch);

export default function Home() {
  const [script, setScript] = useState<Script | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);

  const loadTheme = useCallback(async (theme: Theme) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: theme.name,
          requiresSearch: theme.requiresSearch,
          searchQuery: theme.searchQuery,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate script");
      }

      const data = await response.json();
      setScript(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectTheme = async (theme: Theme) => {
    setContinuousMode(false);
    await loadTheme(theme);
  };

  const handleStartContinuousMode = async () => {
    setContinuousMode(true);
    setCurrentThemeIndex(0);
    await loadTheme(SEARCH_THEMES[0]);
  };

  const handlePracticeComplete = useCallback(async () => {
    if (!continuousMode) return;

    const nextIndex = (currentThemeIndex + 1) % SEARCH_THEMES.length;
    setCurrentThemeIndex(nextIndex);
    await loadTheme(SEARCH_THEMES[nextIndex]);
  }, [continuousMode, currentThemeIndex, loadTheme]);

  const handleBack = () => {
    setScript(null);
    setError(null);
    setContinuousMode(false);
    setCurrentThemeIndex(0);
  };

  const handleStopContinuous = () => {
    setContinuousMode(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        {!script && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Headphones className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold">Shadowing Training</h1>
            </div>
            <p className="text-muted-foreground">
              Improve your English pronunciation through shadowing practice
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Main Content */}
        {script ? (
          <PracticeView
            script={script}
            onBack={handleBack}
            continuousMode={continuousMode}
            onPracticeComplete={handlePracticeComplete}
            onStopContinuous={handleStopContinuous}
            currentThemeIndex={currentThemeIndex}
            totalThemes={SEARCH_THEMES.length}
          />
        ) : (
          <ThemeSelector
            onSelectTheme={handleSelectTheme}
            onStartContinuousMode={handleStartContinuousMode}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
