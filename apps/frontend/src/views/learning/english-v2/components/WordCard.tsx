"use client";

import { cn } from "@/lib/utils";
import type { VocabWord } from "@/views/learning/english-v2/en-vocab-v2.types";

import { ExamplesList } from "./ExamplesList";
import { MeaningsList } from "./MeaningsList";
import { PhrasesList } from "./PhrasesList";
import { WordCardHeader } from "./WordCardHeader";

interface WordCardProps {
  word: VocabWord;
  isLearned: boolean;
  onToggleLearned: (word: VocabWord) => void;
}

export function WordCard({ word, isLearned, onToggleLearned }: WordCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-150 hover:-translate-y-px hover:border-blue-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      {/* Word group badge + learned checkbox row */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-2 dark:border-white/5">
        <span className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">{word.wordGroup}</span>
        <label className="flex cursor-pointer select-none items-center gap-1.5">
          <input type="checkbox" checked={isLearned} onChange={() => onToggleLearned(word)} className="h-3.5 w-3.5 cursor-pointer rounded accent-emerald-500" />
          <span className={cn("text-[11px] font-medium transition-colors", isLearned ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500")}>
            Learned
          </span>
        </label>
      </div>

      <WordCardHeader word={word.word} phonetics={word.phonetics} partsOfSpeech={word.partsOfSpeech} />

      <div className="flex flex-col gap-4 px-5 py-4">
        <MeaningsList meanings={word.meanings} />
        <ExamplesList examples={word.examples} />
        <PhrasesList phrases={word.phrases} />

        {(word.synonyms || word.antonyms) && (
          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3 dark:border-white/5">
            {word.synonyms && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="mr-1 font-semibold text-slate-700 dark:text-slate-300">Syn:</span>
                {word.synonyms}
              </p>
            )}
            {word.antonyms && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="mr-1 font-semibold text-slate-700 dark:text-slate-300">Ant:</span>
                {word.antonyms}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
