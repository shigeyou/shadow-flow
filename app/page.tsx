"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ThemeSelector } from "@/components/theme-selector";
import { PracticeView, unlockAudio } from "@/components/practice-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Script, Theme, PRESET_THEMES } from "@/types";
import { Headphones } from "lucide-react";
import { usePrefetch } from "@/hooks/use-prefetch";

const SEARCH_THEMES = PRESET_THEMES.filter((t) => t.requiresSearch);

export default function Home() {
  const [script, setScript] = useState<Script | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(1.0);

  // History tracking to avoid duplicate news
  const newsHistoryRef = useRef<string[]>([]);

  // Prefetch hook for background loading
  const prefetch = usePrefetch({ newsHistory: newsHistoryRef.current });

  // Prefetch next theme when current index changes in continuous mode
  useEffect(() => {
    if (continuousMode && script) {
      const nextIndex = (currentThemeIndex + 1) % SEARCH_THEMES.length;
      const nextTheme = SEARCH_THEMES[nextIndex];

      // Start prefetching next theme's script in background
      console.log(`[Page] Prefetching next theme: ${nextTheme.name}`);
      prefetch.prefetchScript(nextTheme, newsHistoryRef.current);
    }
  }, [continuousMode, currentThemeIndex, script, prefetch]);

  // Prefetch TTS when script changes
  useEffect(() => {
    if (script && script.sentences.length > 0) {
      console.log(`[Page] Prefetching TTS for ${script.sentences.length} sentences`);
      prefetch.prefetchAllTts(script.sentences, currentSpeed);
    }
  }, [script, currentSpeed, prefetch]);

  const loadTheme = useCallback(async (theme: Theme, excludeTopics: string[] = [], usePrefetchCache = false) => {
    setIsLoading(true);
    setError(null);

    try {
      let data: Script | null = null;

      // Try to use prefetch cache first
      if (usePrefetchCache) {
        data = await prefetch.waitForScript(theme.name);
        if (data) {
          console.log(`[Page] Using prefetched script for: ${theme.name}`);
          // Clear the cache since we're using it now (next time we need fresh content)
          prefetch.clearScriptCache(theme.name);
        }
      }

      // If no cache, fetch normally
      if (!data) {
        console.log(`[Page] Fetching script for: ${theme.name}`);
        const response = await fetch("/api/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme: theme.name,
            requiresSearch: theme.requiresSearch,
            searchQuery: theme.searchQuery,
            excludeTopics: excludeTopics,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate script");
        }

        data = await response.json();
      }

      // Validate response has sentences
      if (!data || !data.sentences || !Array.isArray(data.sentences) || data.sentences.length === 0) {
        throw new Error("Invalid response: no sentences generated");
      }

      // Check for fallback error message
      if (data.sentences.length === 1 && data.sentences[0].text?.includes("Could not generate")) {
        throw new Error("Failed to generate sentences. Please try again.");
      }

      // Add new sentences to history for duplicate avoidance
      if (theme.requiresSearch) {
        const newTopics = data.sentences
          .filter((s: { text?: string }) => s && s.text)
          .map((s: { text: string }) => s.text);
        newsHistoryRef.current = [...newsHistoryRef.current, ...newTopics];
      }

      setScript(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  }, [prefetch]);

  const handleSelectTheme = async (theme: Theme) => {
    setContinuousMode(false);
    newsHistoryRef.current = []; // Clear history for manual theme selection
    await loadTheme(theme);
  };

  const handleStartContinuousMode = async () => {
    // Unlock audio on user interaction for mobile browsers
    await unlockAudio();

    setContinuousMode(true);
    setCurrentThemeIndex(0);
    newsHistoryRef.current = []; // Clear history for new continuous session
    await loadTheme(SEARCH_THEMES[0]);
  };

  const handlePracticeComplete = useCallback(async () => {
    if (!continuousMode) return;

    const nextIndex = (currentThemeIndex + 1) % SEARCH_THEMES.length;
    setCurrentThemeIndex(nextIndex);
    // Use prefetch cache for faster loading
    await loadTheme(SEARCH_THEMES[nextIndex], newsHistoryRef.current, true);
  }, [continuousMode, currentThemeIndex, loadTheme]);

  // Handle speed change from practice view
  const handleSpeedChange = useCallback((newSpeed: number) => {
    setCurrentSpeed(newSpeed);
  }, []);

  const handleBack = () => {
    setScript(null);
    setError(null);
    setContinuousMode(false);
    setCurrentThemeIndex(0);
    newsHistoryRef.current = []; // Clear history when going back
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
            getOrFetchTts={prefetch.getOrFetchTts}
            onSpeedChange={handleSpeedChange}
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
