"use client";

interface ProsConsProps {
  pros: string[];
  cons: string[];
}

export function ProsCons({ pros, cons }: ProsConsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-md border-l-[3px] border-green-500 bg-muted p-3">
        <h5 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-green-600 dark:text-green-400">Pros</h5>
        <ul className="space-y-1 pl-4 text-[0.78rem] text-foreground/85">
          {pros.map((item, i) => (
            <li key={i} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border-l-[3px] border-red-500 bg-muted p-3">
        <h5 className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-red-500 dark:text-red-400">Cons</h5>
        <ul className="space-y-1 pl-4 text-[0.78rem] text-foreground/85">
          {cons.map((item, i) => (
            <li key={i} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
