"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Script, Sentence } from "@/types";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useRecorder } from "@/hooks/use-recorder";
import {
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  Volume2,
  RotateCcw,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Minus,
  Plus,
} from "lucide-react";

interface PracticeViewProps {
  script: Script;
  onBack: () => void;
  continuousMode?: boolean;
  onPracticeComplete?: () => void;
  onStopContinuous?: () => void;
  currentThemeIndex?: number;
  totalThemes?: number;
}

async function synthesizeSpeech(
  text: string,
  rate: number
): Promise<ArrayBuffer> {
  const response = await fetch("/api/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, rate }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to synthesize speech");
  }

  return response.arrayBuffer();
}

// Helper to wait for a duration with pause support
function wait(ms: number, isPausedRef: React.RefObject<boolean>, abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let elapsed = 0;
    const interval = 100; // Check every 100ms

    const tick = () => {
      if (abortSignal?.aborted) {
        resolve();
        return;
      }

      if (isPausedRef.current) {
        // If paused, just schedule next check without incrementing elapsed
        setTimeout(tick, interval);
        return;
      }

      elapsed += interval;
      if (elapsed >= ms) {
        resolve();
      } else {
        setTimeout(tick, interval);
      }
    };

    setTimeout(tick, interval);
  });
}

// Shared audio element for background playback support
let sharedAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    // Enable background playback
    sharedAudio.setAttribute('playsinline', 'true');
    sharedAudio.setAttribute('webkit-playsinline', 'true');
  }
  return sharedAudio;
}

// Setup Media Session for lock screen controls
function setupMediaSession(
  title: string,
  options?: {
    onStop?: () => void;
    onPause?: () => void;
    onResume?: () => void;
  }
) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: 'Shadow Flow',
      album: 'English Shadowing Practice',
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (options?.onPause) {
        options.onPause();
      } else {
        const audio = getSharedAudio();
        audio.pause();
        if (options?.onStop) options.onStop();
      }
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      const audio = getSharedAudio();
      audio.pause();
      if (options?.onStop) options.onStop();
    });

    navigator.mediaSession.setActionHandler('play', () => {
      if (options?.onResume) {
        options.onResume();
      } else {
        const audio = getSharedAudio();
        audio.play().catch(() => {});
      }
    });
  }
}

// Unlock audio on user interaction (call this on button click)
export function unlockAudio(): Promise<void> {
  return new Promise((resolve) => {
    if (audioUnlocked) {
      resolve();
      return;
    }

    const audio = getSharedAudio();

    // Create a short silent audio to unlock
    // Using a data URI for a tiny silent MP3
    const silentAudio = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAGAAGn9AAAIAAANIAAAARMQUx";

    audio.src = silentAudio;
    audio.play().then(() => {
      audioUnlocked = true;
      console.log("Audio unlocked for background playback");
      resolve();
    }).catch((e) => {
      console.log("Audio unlock failed:", e);
      resolve();
    });
  });
}

// Helper to play audio and wait for it to finish using HTML5 Audio (better for background)
// Supports pause/resume via isPausedRef
function playAudioAndWait(
  audioData: ArrayBuffer,
  isPausedRef?: React.RefObject<boolean>,
  abortSignal?: AbortSignal
): Promise<void> {
  return new Promise((resolve) => {
    const blob = new Blob([audioData], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    const audio = getSharedAudio();

    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let pauseCheckInterval: ReturnType<typeof setInterval> | null = null;
    let hasStartedPlaying = false;
    let readyToPlay = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      if (pauseCheckInterval) clearInterval(pauseCheckInterval);
      audio.onended = null;
      audio.onerror = null;
      audio.oncanplay = null;
      audio.oncanplaythrough = null;
      audio.onloadeddata = null;
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    };

    const tryPlay = () => {
      if (resolved || abortSignal?.aborted) {
        cleanup();
        return;
      }

      // If paused, don't start yet
      if (isPausedRef?.current) {
        readyToPlay = true;
        return;
      }

      if (hasStartedPlaying) return;

      hasStartedPlaying = true;
      readyToPlay = true;

      audio.play()
        .then(() => {
          console.log("Audio playback started successfully");
        })
        .catch((e) => {
          console.error("Play failed:", e);
          // Don't cleanup immediately - might be able to retry
          hasStartedPlaying = false;
        });
    };

    // Stop any current playback and clear ALL handlers FIRST
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      // Ignore
    }

    // Clear all existing handlers
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplay = null;
    audio.oncanplaythrough = null;
    audio.onloadeddata = null;
    audio.onloadedmetadata = null;

    // Set up ALL event handlers BEFORE setting src
    audio.onended = () => {
      console.log("Audio ended event fired, hasStartedPlaying:", hasStartedPlaying);
      if (hasStartedPlaying) {
        cleanup();
      }
    };

    audio.onerror = (e) => {
      console.error("Audio error event:", e);
      cleanup();
    };

    // Multiple events as fallback - any of these means we can try playing
    const onReadyToPlay = () => {
      console.log("Audio ready to play, readyState:", audio.readyState);
      if (!hasStartedPlaying && !resolved) {
        tryPlay();
      }
    };

    audio.oncanplay = onReadyToPlay;
    audio.oncanplaythrough = onReadyToPlay;
    audio.onloadeddata = onReadyToPlay;

    // Monitor pause state during playback
    if (isPausedRef) {
      let wasPaused = isPausedRef.current;

      pauseCheckInterval = setInterval(() => {
        if (abortSignal?.aborted) {
          cleanup();
          return;
        }
        if (resolved) {
          if (pauseCheckInterval) clearInterval(pauseCheckInterval);
          return;
        }

        const isPaused = isPausedRef.current;

        if (isPaused && !wasPaused) {
          // Just paused
          if (!audio.paused && hasStartedPlaying) {
            audio.pause();
          }
        } else if (!isPaused && wasPaused) {
          // Just resumed
          if (readyToPlay && !hasStartedPlaying) {
            tryPlay();
          } else if (hasStartedPlaying && audio.paused && !audio.ended) {
            audio.play().catch(() => {});
          }
        }

        wasPaused = isPaused;
      }, 100);
    }

    // NOW set the src - this triggers loading
    audio.src = url;
    audio.load();

    // Fallback: if no event fires within 2 seconds, try playing anyway
    loadTimeoutId = setTimeout(() => {
      console.log("Load timeout - attempting to play anyway, readyState:", audio.readyState);
      if (!hasStartedPlaying && !resolved && audio.readyState >= 2) {
        tryPlay();
      } else if (!hasStartedPlaying && !resolved) {
        // Even if not ready, try - browser might handle it
        console.log("Force attempting playback despite low readyState");
        tryPlay();
      }
    }, 2000);

    // Overall timeout (extended for pause support)
    timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn("Audio overall timeout - cleaning up");
        cleanup();
      }
    }, 120000);
  });
}

export function PracticeView({
  script,
  onBack,
  continuousMode = false,
  onPracticeComplete,
  onStopContinuous,
  currentThemeIndex = 0,
  totalThemes = 1,
}: PracticeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [showTranslation, setShowTranslation] = useState(true);

  // Auto-play mode state
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoPlayStatus, setAutoPlayStatus] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const isPausedRef = useRef(false);
  const pauseResolverRef = useRef<(() => void) | null>(null);
  const hasStartedRef = useRef(false);

  const audioPlayer = useAudioPlayer();
  const recorder = useRecorder();

  // Guard against empty or invalid sentences array
  const sentences = script.sentences || [];
  const currentSentence = sentences[currentIndex] || { id: 0, text: "", translation: "" };

  // Pause duration (in ms) - time for user to shadow
  const PAUSE_DURATION = 3000;

  const handlePlaySentence = useCallback(
    async (sentence: Sentence) => {
      try {
        setIsGeneratingAudio(true);
        const audioData = await synthesizeSpeech(sentence.text, speed);
        audioPlayer.play(audioData);
      } catch (error) {
        console.error("Failed to synthesize speech:", error);
        alert("Failed to generate audio. Please check your Azure Speech key.");
      } finally {
        setIsGeneratingAudio(false);
      }
    },
    [audioPlayer, speed]
  );

  // Pause/Resume callbacks
  const pauseAutoPlay = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    // Pause audio immediately
    const audio = getSharedAudio();
    if (audio && !audio.paused) {
      audio.pause();
    }
  }, []);

  const resumeAutoPlay = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    // Resume audio if it was playing
    const audio = getSharedAudio();
    if (audio && audio.paused && !audio.ended && audio.src) {
      audio.play().catch(() => {});
    }
  }, []);

  // Auto-play mode logic
  const startAutoPlay = useCallback(async () => {
    // Stop any existing playback first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset pause state
    isPausedRef.current = false;
    setIsPaused(false);

    // Unlock audio for mobile browsers
    await unlockAudio();

    // Setup media session for lock screen controls and background playback
    setupMediaSession(script.theme, {
      onStop: () => {
        // On stop from lock screen
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setIsAutoPlaying(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setAutoPlayStatus("");
      },
      onPause: () => {
        // On pause from lock screen
        isPausedRef.current = true;
        setIsPaused(true);
        const audio = getSharedAudio();
        if (audio && !audio.paused) {
          audio.pause();
        }
      },
      onResume: () => {
        // On resume from lock screen
        isPausedRef.current = false;
        setIsPaused(false);
        const audio = getSharedAudio();
        if (audio && audio.paused && !audio.ended && audio.src) {
          audio.play().catch(() => {});
        }
      },
    });

    setIsAutoPlaying(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Skip if no valid sentences
      if (sentences.length === 0) {
        console.warn("No sentences to play");
        return;
      }

      for (let i = 0; i < sentences.length; i++) {
        // Check if aborted
        if (signal.aborted) break;

        const sentence = sentences[i];

        // Skip invalid sentences
        if (!sentence || !sentence.text) {
          console.warn(`Skipping invalid sentence at index ${i}`);
          continue;
        }

        setCurrentIndex(i);

        // Generate audio once for this sentence
        setAutoPlayStatus(`Generating audio for sentence ${i + 1}...`);
        const audioData = await synthesizeSpeech(sentence.text, speed);

        // First play
        if (signal.aborted) break;
        setAutoPlayStatus(isPausedRef.current ? "Paused" : `Playing sentence ${i + 1} (1st time)`);
        await playAudioAndWait(audioData, isPausedRef, signal);

        // Pause for shadowing
        if (signal.aborted) break;
        setAutoPlayStatus(isPausedRef.current ? "Paused" : `Pause - Shadow sentence ${i + 1}...`);
        await wait(PAUSE_DURATION, isPausedRef, signal);

        // Second play
        if (signal.aborted) break;
        setAutoPlayStatus(isPausedRef.current ? "Paused" : `Playing sentence ${i + 1} (2nd time)`);
        await playAudioAndWait(audioData, isPausedRef, signal);

        // Pause before next sentence
        if (i < sentences.length - 1) {
          if (signal.aborted) break;
          setAutoPlayStatus(isPausedRef.current ? "Paused" : `Pause - Shadow again...`);
          await wait(PAUSE_DURATION, isPausedRef, signal);
        }
      }

      // Check if we completed without being aborted
      if (!signal.aborted) {
        if (continuousMode && onPracticeComplete) {
          setAutoPlayStatus("Loading next theme...");
          await wait(1000, isPausedRef, signal);
          onPracticeComplete();
          return; // Don't reset state, parent will handle it
        } else {
          setAutoPlayStatus("Completed!");
          await wait(1000, isPausedRef, signal);
        }
      }
    } catch (error) {
      console.error("Auto-play error:", error);
    } finally {
      if (!continuousMode || abortControllerRef.current?.signal.aborted) {
        setIsAutoPlaying(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setAutoPlayStatus("");
      }
      abortControllerRef.current = null;
    }
  }, [sentences, speed, isAutoPlaying, continuousMode, onPracticeComplete]);

  const stopAutoPlay = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Also pause the shared audio
    const audio = getSharedAudio();
    if (audio) {
      audio.pause();
    }
    setIsAutoPlaying(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setAutoPlayStatus("");
    if (continuousMode && onStopContinuous) {
      onStopContinuous();
    }
  }, [continuousMode, onStopContinuous]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update status when paused/resumed
  useEffect(() => {
    if (isAutoPlaying && isPaused) {
      setAutoPlayStatus("Paused");
    }
  }, [isPaused, isAutoPlaying]);

  // Auto-start when in continuous mode and script changes
  useEffect(() => {
    if (continuousMode) {
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        setCurrentIndex(0);
        startAutoPlay();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.theme, continuousMode]); // Trigger when theme changes in continuous mode

  const handleToggleRecording = useCallback(async () => {
    if (recorder.isRecording) {
      recorder.stopRecording();
    } else {
      recorder.clearRecording();
      await recorder.startRecording();
    }
  }, [recorder]);

  const handlePlayRecording = useCallback(() => {
    if (recorder.recordedUrl) {
      audioPlayer.play(recorder.recordedUrl);
    }
  }, [audioPlayer, recorder.recordedUrl]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      recorder.clearRecording();
      audioPlayer.stop();
    }
  };

  const handleNext = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
      recorder.clearRecording();
      audioPlayer.stop();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            stopAutoPlay();
            onBack();
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {continuousMode ? "Stop & Exit" : "Back"}
        </Button>
        <div className="flex items-center gap-2">
          {continuousMode && (
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">
              Theme {currentThemeIndex + 1} / {totalThemes}
            </Badge>
          )}
          <Badge variant="outline" className="text-lg px-4 py-1">
            {script.theme}
          </Badge>
        </div>
      </div>

      {/* Continuous Mode Progress */}
      {continuousMode && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall:</span>
          <div className="flex-1 h-2 bg-muted rounded-full">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{
                width: `${((currentThemeIndex + 1) / totalThemes) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Sentence Progress */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sentence:</span>
        <div className="flex-1 h-2 bg-muted rounded-full">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / sentences.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-sm font-medium">
          {currentIndex + 1} / {sentences.length}
        </span>
      </div>

      {/* Current Sentence */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Sentence {currentIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xl md:text-2xl font-medium leading-relaxed">
            {currentSentence.text}
          </p>
          {showTranslation && currentSentence.translation && (
            <p className="text-muted-foreground">
              {currentSentence.translation}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTranslation(!showTranslation)}
          >
            {showTranslation ? "Hide" : "Show"} Translation
          </Button>
        </CardContent>
      </Card>

      {/* Auto-Play Mode */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className={`h-5 w-5 ${isAutoPlaying && !isPaused ? "animate-spin" : ""}`} />
            Auto-Play Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each sentence plays twice with pauses for shadowing practice.
          </p>
          {autoPlayStatus && (
            <div className={`p-3 rounded-lg ${isPaused ? "bg-yellow-500/20" : "bg-muted"}`}>
              <p className="text-sm font-medium">{isPaused ? "⏸ Paused" : autoPlayStatus}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {isAutoPlaying ? (
              <>
                {/* Pause/Resume button */}
                {isPaused ? (
                  <Button
                    onClick={resumeAutoPlay}
                    variant="default"
                    className="flex-1"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    onClick={pauseAutoPlay}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                {/* Stop button */}
                <Button
                  onClick={stopAutoPlay}
                  variant="destructive"
                  size="icon"
                  className="shrink-0"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={startAutoPlay}
                className="flex-1"
                disabled={isGeneratingAudio}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Auto-Play
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Speed Control */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Playback Speed</span>
              <Badge variant="secondary" className="min-w-[4rem] text-center">{speed.toFixed(2)}x</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  const newSpeed = Math.max(0.7, speed - 0.05);
                  setSpeed(Math.round(newSpeed * 100) / 100);
                  audioPlayer.setPlaybackRate(newSpeed);
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="range"
                value={speed}
                onChange={(e) => {
                  const newSpeed = parseFloat(e.target.value);
                  setSpeed(newSpeed);
                  audioPlayer.setPlaybackRate(newSpeed);
                }}
                min={0.7}
                max={2.0}
                step={0.05}
                className="flex-1 h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-primary touch-pan-x"
                style={{ touchAction: 'pan-x' }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  const newSpeed = Math.min(2.0, speed + 0.05);
                  setSpeed(Math.round(newSpeed * 100) / 100);
                  audioPlayer.setPlaybackRate(newSpeed);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Manual Play
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePlaySentence(currentSentence)}
              disabled={isGeneratingAudio || audioPlayer.isPlaying || isAutoPlaying}
              className="flex-1"
            >
              {isGeneratingAudio ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : audioPlayer.isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Playing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play Once
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={audioPlayer.stop}
              disabled={!audioPlayer.isPlaying || isAutoPlaying}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Your Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleToggleRecording}
              variant={recorder.isRecording ? "destructive" : "default"}
              className="flex-1"
              disabled={isAutoPlaying}
            >
              {recorder.isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          {recorder.recordedUrl && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePlayRecording}
                className="flex-1"
                disabled={isAutoPlaying}
              >
                <Play className="h-4 w-4 mr-2" />
                Play Recording
              </Button>
              <Button variant="outline" onClick={recorder.clearRecording} disabled={isAutoPlaying}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isAutoPlaying}
          className="flex-1"
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentIndex === sentences.length - 1 || isAutoPlaying}
          className="flex-1"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
