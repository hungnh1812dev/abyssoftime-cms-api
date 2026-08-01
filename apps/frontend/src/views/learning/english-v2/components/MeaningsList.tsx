import type { Meaning } from "@/views/learning/english-v2/en-vocab-v2.types";

interface MeaningsListProps {
  meanings: Meaning[];
}

export function MeaningsList({ meanings }: MeaningsListProps) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Nghĩa</p>
      <ul className="flex flex-col gap-2">
        {meanings.map((meaning, i) => (
          <li key={i} className="grid grid-cols-[18px_1fr] items-baseline gap-x-2.5 gap-y-0.5 text-sm">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-500">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] italic text-slate-400 dark:text-slate-500">{meaning.posLabel}</span>
              <span className="text-sm text-slate-800 dark:text-slate-200">{meaning.en}</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{meaning.vi}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
