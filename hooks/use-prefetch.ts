"use client";

import { useRef, useCallback } from "react";
import { Script, Theme, Sentence } from "@/types";

interface PrefetchCache {
  // Script cache: theme name -> script
  scripts: Map<string, Script>;
  // TTS cache: text+rate -> ArrayBuffer
  tts: Map<string, ArrayBuffer>;
  // Prefetch in progress
  pendingScripts: Map<string, Promise<Script | null>>;
  pendingTts: Map<string, Promise<ArrayBuffer | null>>;
}

interface UsePrefetchOptions {
  newsHistory: string[];
}

async function fetchScript(
  theme: Theme,
  excludeTopics: string[] = []
): Promise<Script | null> {
  try {
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
      console.error("Failed to prefetch script:", response.status);
      return null;
    }

    const data = await response.json();

    // Validate response
    if (!data.sentences || !Array.isArray(data.sentences) || data.sentences.length === 0) {
      console.error("Invalid prefetched script: no sentences");
      return null;
    }

    // Check for fallback error message
    if (data.sentences.length === 1 &&
        data.sentences[0].text?.includes("Could not generate")) {
      console.error("Script generation returned fallback error");
      return null;
    }

    return data as Script;
  } catch (error) {
    console.error("Error prefetching script:", error);
    return null;
  }
}

async function fetchTts(text: string, rate: number): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, rate }),
    });

    if (!response.ok) {
      console.error("Failed to prefetch TTS:", response.status);
      return null;
    }

    return response.arrayBuffer();
  } catch (error) {
    console.error("Error prefetching TTS:", error);
    return null;
  }
}

function getTtsKey(text: string, rate: number): string {
  return `${text}::${rate.toFixed(2)}`;
}

export function usePrefetch(options: UsePrefetchOptions) {
  const cacheRef = useRef<PrefetchCache>({
    scripts: new Map(),
    tts: new Map(),
    pendingScripts: new Map(),
    pendingTts: new Map(),
  });

  // Prefetch a script for a theme
  const prefetchScript = useCallback(
    async (theme: Theme, excludeTopics: string[] = []): Promise<void> => {
      const cache = cacheRef.current;
      const key = theme.name;

      // Already cached or in progress
      if (cache.scripts.has(key) || cache.pendingScripts.has(key)) {
        return;
      }

      console.log(`[Prefetch] Starting script prefetch for: ${theme.name}`);

      const promise = fetchScript(theme, excludeTopics);
      cache.pendingScripts.set(key, promise);

      const script = await promise;
      cache.pendingScripts.delete(key);

      if (script) {
        cache.scripts.set(key, script);
        console.log(`[Prefetch] Script cached for: ${theme.name}`);
      }
    },
    []
  );

  // Prefetch TTS for a sentence
  const prefetchTts = useCallback(
    async (text: string, rate: number): Promise<void> => {
      const cache = cacheRef.current;
      const key = getTtsKey(text, rate);

      // Already cached or in progress
      if (cache.tts.has(key) || cache.pendingTts.has(key)) {
        return;
      }

      const promise = fetchTts(text, rate);
      cache.pendingTts.set(key, promise);

      const audio = await promise;
      cache.pendingTts.delete(key);

      if (audio) {
        cache.tts.set(key, audio);
        console.log(`[Prefetch] TTS cached for: "${text.substring(0, 30)}..."`);
      }
    },
    []
  );

  // Prefetch TTS for all sentences in a script
  const prefetchAllTts = useCallback(
    async (sentences: Sentence[], rate: number): Promise<void> => {
      console.log(`[Prefetch] Starting TTS prefetch for ${sentences.length} sentences`);

      // Prefetch all in parallel
      await Promise.all(
        sentences.map((sentence) => prefetchTts(sentence.text, rate))
      );

      console.log(`[Prefetch] TTS prefetch complete for ${sentences.length} sentences`);
    },
    [prefetchTts]
  );

  // Get cached script (returns null if not cached yet)
  const getCachedScript = useCallback((themeName: string): Script | null => {
    return cacheRef.current.scripts.get(themeName) || null;
  }, []);

  // Get cached TTS (returns null if not cached yet)
  const getCachedTts = useCallback(
    (text: string, rate: number): ArrayBuffer | null => {
      const key = getTtsKey(text, rate);
      return cacheRef.current.tts.get(key) || null;
    },
    []
  );

  // Wait for pending script prefetch
  const waitForScript = useCallback(
    async (themeName: string): Promise<Script | null> => {
      const cache = cacheRef.current;

      // Already cached
      if (cache.scripts.has(themeName)) {
        return cache.scripts.get(themeName)!;
      }

      // Wait for pending
      if (cache.pendingScripts.has(themeName)) {
        await cache.pendingScripts.get(themeName);
        return cache.scripts.get(themeName) || null;
      }

      return null;
    },
    []
  );

  // Wait for pending TTS prefetch or fetch it
  const getOrFetchTts = useCallback(
    async (text: string, rate: number): Promise<ArrayBuffer | null> => {
      const cache = cacheRef.current;
      const key = getTtsKey(text, rate);

      // Already cached
      if (cache.tts.has(key)) {
        console.log(`[Prefetch] TTS cache hit for: "${text.substring(0, 30)}..."`);
        return cache.tts.get(key)!;
      }

      // Wait for pending
      if (cache.pendingTts.has(key)) {
        console.log(`[Prefetch] Waiting for pending TTS: "${text.substring(0, 30)}..."`);
        await cache.pendingTts.get(key);
        return cache.tts.get(key) || null;
      }

      // Not cached, fetch now
      console.log(`[Prefetch] TTS cache miss, fetching: "${text.substring(0, 30)}..."`);
      const audio = await fetchTts(text, rate);
      if (audio) {
        cache.tts.set(key, audio);
      }
      return audio;
    },
    []
  );

  // Clear script cache for a theme (used when we need fresh content)
  const clearScriptCache = useCallback((themeName: string): void => {
    cacheRef.current.scripts.delete(themeName);
  }, []);

  // Clear all TTS cache
  const clearTtsCache = useCallback((): void => {
    cacheRef.current.tts.clear();
  }, []);

  // Clear all caches
  const clearAllCaches = useCallback((): void => {
    cacheRef.current.scripts.clear();
    cacheRef.current.tts.clear();
  }, []);

  return {
    prefetchScript,
    prefetchTts,
    prefetchAllTts,
    getCachedScript,
    getCachedTts,
    waitForScript,
    getOrFetchTts,
    clearScriptCache,
    clearTtsCache,
    clearAllCaches,
  };
}
