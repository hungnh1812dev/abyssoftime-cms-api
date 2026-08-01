import type { Example } from "@/views/learning/english-v2/en-vocab-v2.types";

interface ExamplesListProps {
  examples: Example[];
}

export function ExamplesList({ examples }: ExamplesListProps) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ví dụ</p>
      <div className="flex flex-col gap-2">
        {examples.map((ex, i) => (
          <div key={i} className="rounded-r-md border-l-2 border-emerald-500 bg-emerald-50 px-3 py-2 dark:border-emerald-400 dark:bg-emerald-950/30">
            <p className="text-sm italic text-slate-700 dark:text-slate-200">{ex.en}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{ex.vi}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
