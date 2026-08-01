"use client";

import { useCallback, useState } from "react";

import type { LearnedWordEntry, VocabWord } from "@/views/learning/english-v2/en-vocab-v2.types";

const STORAGE_KEY = "en-vocab.learned";

type LearnedWordsMap = Record<string, LearnedWordEntry>;

function readFromStorage(): LearnedWordsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LearnedWordsMap) : {};
  } catch {
    return {};
  }
}

function writeToStorage(map: LearnedWordsMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export function useLearnedWords() {
  const [learnedMap, setLearnedMap] = useState<LearnedWordsMap>(() => readFromStorage());

  const toggleLearned = useCallback((wordData: VocabWord) => {
    setLearnedMap((prev) => {
      const next = { ...prev };
      if (next[wordData.word]) {
        delete next[wordData.word];
      } else {
        next[wordData.word] = {
          word: wordData.word,
          // meaning: wordData.meanings[0]?.en ?? "",
          meaning: wordData.meanings[0],
          ipa: wordData.phonetics[0]?.ipa ?? "",
        };
      }
      writeToStorage(next);
      return next;
    });
  }, []);

  const isLearned = useCallback((word: string) => Boolean(learnedMap[word]), [learnedMap]);

  const getAllLearnedWords = useCallback((): LearnedWordEntry[] => Object.values(learnedMap), [learnedMap]);

  const resetLearned = useCallback(() => {
    writeToStorage({});
    setLearnedMap({});
  }, []);

  return {
    learnedWords: new Set(Object.keys(learnedMap)),
    toggleLearned,
    isLearned,
    getAllLearnedWords,
    resetLearned,
  };
}
