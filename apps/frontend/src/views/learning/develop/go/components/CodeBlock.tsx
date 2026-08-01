import type { CodeExample } from "@/views/learning/develop/go/go-knowledge.types";

const LANG_LABELS: Record<string, string> = {
  go: "Go",
  bash: "Bash",
  json: "JSON",
  yaml: "YAML",
};

const LANG_COLORS: Record<string, string> = {
  go: "text-cyan-400",
  bash: "text-green-400",
  json: "text-orange-400",
  yaml: "text-purple-400",
};

interface CodeBlockProps {
  example: CodeExample;
}

export function CodeBlock({ example }: CodeBlockProps) {
  const label = LANG_LABELS[example.language] ?? example.language;
  const color = LANG_COLORS[example.language] ?? "text-muted-foreground";

  return (
    <div className="mt-3 overflow-hidden rounded-lg border dark:border-zinc-700/60">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-1.5 dark:border-zinc-700/60 dark:bg-zinc-800/80">
        <span className={`font-mono text-[11px] font-semibold ${color}`}>{label}</span>
        {example.caption && <span className="text-[11px] italic text-muted-foreground">{example.caption}</span>}
      </div>
      <pre className="overflow-x-auto bg-muted/30 p-4 font-mono text-xs leading-relaxed dark:bg-zinc-900/90 dark:text-zinc-300">
        <code className="whitespace-pre">{example.code}</code>
      </pre>
    </div>
  );
}
