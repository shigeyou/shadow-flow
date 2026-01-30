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

// Helper to wait for a duration
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Audio context for mobile compatibility
let audioContext: AudioContext | null = null;
let audioUnlocked = false;

// Unlock audio on user interaction (call this on button click)
export function unlockAudio(): Promise<void> {
  return new Promise((resolve) => {
    if (audioUnlocked) {
      resolve();
      return;
    }

    // Create audio context
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        audioUnlocked = true;
        console.log("Audio context unlocked");
        resolve();
      }).catch(() => {
        resolve();
      });
    } else {
      audioUnlocked = true;
      resolve();
    }

    // Also create and play a silent buffer to unlock
    try {
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (e) {
      console.log("Silent buffer play failed:", e);
    }
  });
}

// Helper to play audio and wait for it to finish using Web Audio API
function playAudioAndWait(audioData: ArrayBuffer): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      // Ensure audio context exists
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));

      // Create source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      source.onended = () => {
        resolve();
      };

      source.start(0);

      // Fallback timeout
      setTimeout(() => {
        resolve();
      }, 30000);

    } catch (error) {
      console.error("Web Audio playback failed:", error);
      // Fallback to HTML5 Audio
      try {
        const blob = new Blob([audioData], { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };

        await audio.play();
      } catch (fallbackError) {
        console.error("Fallback audio also failed:", fallbackError);
        resolve();
      }
    }
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
  const [autoPlayStatus, setAutoPlayStatus] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
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

  // Auto-play mode logic
  const startAutoPlay = useCallback(async () => {
    // Stop any existing playback first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Unlock audio for mobile browsers
    await unlockAudio();

    setIsAutoPlaying(true);
    abortControllerRef.current = new AbortController();

    try {
      // Skip if no valid sentences
      if (sentences.length === 0) {
        console.warn("No sentences to play");
        return;
      }

      for (let i = 0; i < sentences.length; i++) {
        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) break;

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
        if (abortControllerRef.current?.signal.aborted) break;
        setAutoPlayStatus(`Playing sentence ${i + 1} (1st time)`);
        await playAudioAndWait(audioData);

        // Pause for shadowing
        if (abortControllerRef.current?.signal.aborted) break;
        setAutoPlayStatus(`Pause - Shadow sentence ${i + 1}...`);
        await wait(PAUSE_DURATION);

        // Second play
        if (abortControllerRef.current?.signal.aborted) break;
        setAutoPlayStatus(`Playing sentence ${i + 1} (2nd time)`);
        await playAudioAndWait(audioData);

        // Pause before next sentence
        if (i < sentences.length - 1) {
          if (abortControllerRef.current?.signal.aborted) break;
          setAutoPlayStatus(`Pause - Shadow again...`);
          await wait(PAUSE_DURATION);
        }
      }

      // Check if we completed without being aborted
      if (!abortControllerRef.current?.signal.aborted) {
        if (continuousMode && onPracticeComplete) {
          setAutoPlayStatus("Loading next theme...");
          await wait(1000);
          onPracticeComplete();
          return; // Don't reset state, parent will handle it
        } else {
          setAutoPlayStatus("Completed!");
          await wait(1000);
        }
      }
    } catch (error) {
      console.error("Auto-play error:", error);
    } finally {
      if (!continuousMode || abortControllerRef.current?.signal.aborted) {
        setIsAutoPlaying(false);
        setAutoPlayStatus("");
      }
      abortControllerRef.current = null;
    }
  }, [sentences, speed, isAutoPlaying, continuousMode, onPracticeComplete]);

  const stopAutoPlay = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAutoPlaying(false);
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
            <RefreshCw className={`h-5 w-5 ${isAutoPlaying ? "animate-spin" : ""}`} />
            Auto-Play Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each sentence plays twice with pauses for shadowing practice.
          </p>
          {autoPlayStatus && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{autoPlayStatus}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            {isAutoPlaying ? (
              <Button
                onClick={stopAutoPlay}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Auto-Play
              </Button>
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
