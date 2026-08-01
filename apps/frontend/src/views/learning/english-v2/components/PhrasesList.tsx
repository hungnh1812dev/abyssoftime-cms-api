import type { Phrase } from "@/views/learning/english-v2/en-vocab-v2.types";

interface PhrasesListProps {
  phrases: Phrase[];
}

export function PhrasesList({ phrases }: PhrasesListProps) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cụm từ thông dụng</p>
      <div className="flex flex-col">
        {phrases.map((phrase, i) => (
          <div key={i} className="dark:border-white/6 flex items-baseline justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0 dark:border-white/5">
            <span className="whitespace-nowrap font-medium text-blue-600 dark:text-blue-300">{phrase.en}</span>
            <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">→</span>
            <span className="text-right text-xs text-slate-600 dark:text-slate-400">{phrase.vi}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
