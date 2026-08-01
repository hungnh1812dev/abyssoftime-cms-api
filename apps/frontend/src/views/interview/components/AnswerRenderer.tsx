import { cn } from "@/lib/utils";

interface AnswerRendererProps {
  text: string;
  className?: string;
}

function renderInline(segment: string): React.ReactNode[] {
  const parts = segment.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em] text-foreground/90">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderBlock(block: string, blockIndex: number): React.ReactNode {
  // Markdown table: lines starting with |
  const lines = block.split("\n");
  if (lines[0]?.trim().startsWith("|")) {
    const tableLines = lines.filter((l) => l.trim().startsWith("|"));
    const headerRow = tableLines[0];
    const bodyRows = tableLines.slice(2); // skip separator line
    const parseRow = (row: string) =>
      row
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
    const headers = parseRow(headerRow);
    const rows = bodyRows.map(parseRow);
    return (
      <div key={blockIndex} className="my-2 overflow-x-auto rounded border dark:border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold text-foreground/80">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t dark:border-border/60">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-foreground/70">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Bullet list block
  const bulletLines = lines.filter((l) => /^\s*-\s/.test(l));
  const nonBulletLines = lines.filter((l) => !/^\s*-\s/.test(l) && l.trim() !== "");
  if (bulletLines.length > 0 && bulletLines.length === lines.filter((l) => l.trim() !== "").length) {
    return (
      <ul key={blockIndex} className="my-1.5 list-disc space-y-0.5 pl-5 text-foreground/75">
        {bulletLines.map((line, i) => (
          <li key={i}>{renderInline(line.replace(/^\s*-\s/, ""))}</li>
        ))}
      </ul>
    );
  }

  // Mixed: non-bullet lines followed by bullet lines
  if (bulletLines.length > 0) {
    return (
      <div key={blockIndex}>
        {nonBulletLines.map((line, i) => (
          <p key={i} className="my-1 text-foreground/75">
            {renderInline(line)}
          </p>
        ))}
        <ul className="my-1.5 list-disc space-y-0.5 pl-5 text-foreground/75">
          {bulletLines.map((line, i) => (
            <li key={i}>{renderInline(line.replace(/^\s*-\s/, ""))}</li>
          ))}
        </ul>
      </div>
    );
  }

  // Plain paragraph
  return (
    <p key={blockIndex} className="my-1 text-foreground/75">
      {renderInline(block)}
    </p>
  );
}

export function AnswerRenderer({ text, className }: AnswerRendererProps) {
  // Split by triple-backtick code blocks first
  const segments = text.split(/(```[\w]*\n[\s\S]*?```)/g);

  const nodes: React.ReactNode[] = [];
  let nodeIndex = 0;

  for (const segment of segments) {
    if (segment.startsWith("```")) {
      // Extract language and code
      const firstNewline = segment.indexOf("\n");
      const lang = segment.slice(3, firstNewline).trim() || "text";
      const code = segment.slice(firstNewline + 1, -3);
      nodes.push(
        <div key={nodeIndex++} className="my-2 overflow-x-auto rounded-md border bg-muted/50 dark:border-border/60 dark:bg-muted/20">
          <div className="flex items-center justify-between border-b px-3 py-1 dark:border-border/60">
            <span className="font-mono text-[10px] text-muted-foreground">{lang}</span>
          </div>
          <pre className="p-3 text-xs leading-relaxed text-foreground/85">
            <code>{code}</code>
          </pre>
        </div>,
      );
    } else if (segment.trim()) {
      // Split non-code content by blank lines into blocks
      const blocks = segment.split(/\n{2,}/);
      for (const block of blocks) {
        const trimmed = block.trim();
        if (trimmed) {
          nodes.push(renderBlock(trimmed, nodeIndex++));
        }
      }
    }
  }

  return <div className={cn("text-sm leading-relaxed", className)}>{nodes}</div>;
}
