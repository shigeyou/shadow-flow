"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (audioData: ArrayBuffer | string) => void;
  pause: () => void;
  stop: () => void;
  setPlaybackRate: (rate: number) => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const play = useCallback((audioData: ArrayBuffer | string) => {
    // Clean up previous audio
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }

    let url: string;
    if (typeof audioData === "string") {
      url = audioData;
    } else {
      const blob = new Blob([audioData], { type: "audio/mp3" });
      url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    setPlaybackRate,
  };
}
