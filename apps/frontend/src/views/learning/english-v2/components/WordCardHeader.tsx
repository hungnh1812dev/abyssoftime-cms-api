import { cn } from "@/lib/utils";
import type { Phonetics } from "@/views/learning/english-v2/en-vocab-v2.types";
import { parsePOS, POS_LABEL, POS_STYLE } from "@/views/learning/english-v2/en-vocab-v2.types";

import { AudioButton } from "./AudioButton";

interface WordCardHeaderProps {
  word: string;
  phonetics: Phonetics[];
  partsOfSpeech: string;
}

export function WordCardHeader({ word, phonetics, partsOfSpeech }: WordCardHeaderProps) {
  const posList = parsePOS(partsOfSpeech);

  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
      {/* Word + phonetics */}
      <div className="min-w-0 flex-1">
        <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{word}</h3>
        <div className="mt-1 flex flex-col gap-1.5">
          {phonetics.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-sm text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{p.ipa}</span>
              {p.source && <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{p.source}</span>}
              <AudioButton word={word} audioUrl={p.audio} />
              {i === 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {p.syllableParts.map((part, si) => (
                    <span key={si}>
                      {si > 0 && " · "}
                      {part.stressed ? <strong className="font-bold text-amber-600 dark:text-amber-300">{part.text}</strong> : part.text}
                    </span>
                  ))}
                  {p.syllableNote && <span className="ml-1 text-slate-400 dark:text-slate-500">{p.syllableNote}</span>}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* POS tags */}
      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-1">
          {posList.map((pos) => (
            <span
              key={pos}
              className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider", POS_STYLE[pos] ?? "bg-slate-500/15 text-slate-600 dark:text-slate-300")}>
              {POS_LABEL[pos] ?? pos}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
