import React from "react";

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function renderBody(text: string): React.ReactNode {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line === "") {
      result.push(<div key={`gap-${i}`} className="h-1.5" />);
    } else if (line.startsWith("- ")) {
      result.push(
        <div key={i} className="flex items-baseline gap-2">
          <span className="mt-[0.375rem] h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="text-sm leading-relaxed text-foreground/80">{renderInline(line.slice(2))}</span>
        </div>,
      );
    } else {
      result.push(
        <p key={i} className="text-sm leading-relaxed text-foreground/80">
          {renderInline(line)}
        </p>,
      );
    }
  });

  return <>{result}</>;
}
