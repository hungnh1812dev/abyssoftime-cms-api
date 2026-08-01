"use client";

import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface AudioButtonProps {
  word: string;
  audioUrl?: string | null;
}

export function AudioButton({ word, audioUrl }: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function speakFallback() {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
  }

  function handleSpeak() {
    if (playing) return;

    // No recorded audio for this source — fall back to browser TTS
    if (!audioUrl) {
      speakFallback();
      return;
    }

    const audio = audioRef.current ?? new Audio(audioUrl);
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      setPlaying(false);
      speakFallback();
    };
    audio.play().catch(speakFallback);
  }

  return (
    <button
      onClick={handleSpeak}
      aria-label={`Phát âm "${word}"`}
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-all",
        playing
          ? "animate-pulse border-cyan-400 bg-cyan-500/20 text-cyan-300"
          : "border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-blue-500/15 dark:hover:text-blue-300",
      )}>
      <Volume2 className="h-4 w-4" />
    </button>
  );
}
