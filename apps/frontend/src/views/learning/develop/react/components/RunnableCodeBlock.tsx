"use client";

import { Loader2, Play, RotateCcw, Square, Terminal } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { CodeExample } from "@/views/learning/develop/react/react-knowledge.types";

const LANG_LABELS: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  tsx: "TSX",
  bash: "Bash",
  json: "JSON",
};

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  tsx: "text-sky-400",
  bash: "text-green-400",
  json: "text-orange-400",
};

type RunState = "idle" | "running" | "done" | "error";

function buildSrcdoc(code: string, id: string): string {
  // Escape </script> inside user code so it doesn't break the HTML parser
  const escaped = code.replace(/<\/script>/gi, "<\\/script>");
  const safeId = JSON.stringify(id);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
(function(){
  var ID=${safeId};
  var logs=[];
  function send(type,extra){
    var msg=Object.assign({type:type,id:ID,data:logs.slice()},extra||{});
    window.parent.postMessage(msg,"*");
  }
  function capture(prefix){
    return function(){
      var args=Array.prototype.slice.call(arguments);
      var line=args.map(function(a){
        try{return typeof a==="object"&&a!==null?JSON.stringify(a,null,2):String(a);}
        catch(e){return String(a);}
      }).join(" ");
      logs.push(prefix+line);
      send("log");
    };
  }
  console.log=capture("");
  console.warn=capture("⚠ ");
  console.error=capture("✖ ");
  try{
    (function(){"use strict";
${escaped}
    })();
    send("done");
  }catch(e){
    send("error",{message:e.message});
  }
})();
<\/script></body></html>`;
}

interface RunnableCodeBlockProps {
  example: CodeExample;
}

export function RunnableCodeBlock({ example }: RunnableCodeBlockProps) {
  const rawId = useId();
  const instanceId = rawId.replace(/:/g, "_");

  const [runState, setRunState] = useState<RunState>("idle");
  const [output, setOutput] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [iframeActive, setIframeActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = LANG_LABELS[example.language] ?? example.language;
  const color = LANG_COLORS[example.language] ?? "text-muted-foreground";

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.id !== instanceId) return;
      const { type, data, message } = e.data as {
        type: string;
        data: string[];
        message?: string;
      };
      if (type === "log") {
        setOutput([...data]);
      } else if (type === "done") {
        setOutput([...data]);
        setRunState("done");
        setIframeActive(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else if (type === "error") {
        setOutput([...data]);
        setErrorMsg(message ?? "Unknown error");
        setRunState("error");
        setIframeActive(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [instanceId]);

  const startRun = useCallback((resetKey: boolean) => {
    setOutput([]);
    setErrorMsg(null);
    setRunState("running");
    setIframeActive(true);
    if (resetKey) setRunKey((k) => k + 1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setRunState("error");
      setErrorMsg("Timed out after 5 seconds");
      setIframeActive(false);
    }, 5000);
  }, []);

  const doRun = useCallback(() => startRun(true), [startRun]);

  const doStop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIframeActive(false);
    setRunState("idle");
    setOutput([]);
    setErrorMsg(null);
  }, []);

  const doRestart = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIframeActive(false);
    // Next tick so iframe unmounts before remounting with new key
    setTimeout(() => startRun(true), 16);
  }, [startRun]);

  const showOutput = runState !== "idle";

  return (
    <div className="mt-3 overflow-hidden rounded-lg border dark:border-zinc-700/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted px-3 py-1.5 dark:border-zinc-700/60 dark:bg-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[11px] font-semibold ${color}`}>{label}</span>
          <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-green-600 dark:text-green-400">▸ live</span>
          {example.caption && <span className="text-[11px] italic text-muted-foreground">{example.caption}</span>}
        </div>
        <div className="flex items-center gap-1">
          {runState === "idle" && (
            <button onClick={doRun} className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-green-700">
              <Play className="h-2.5 w-2.5" />
              Run
            </button>
          )}
          {runState === "running" && (
            <button onClick={doStop} className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-red-700">
              <Square className="h-2.5 w-2.5 fill-current" />
              Stop
            </button>
          )}
          {(runState === "done" || runState === "error") && (
            <>
              <button
                onClick={doRestart}
                className="flex items-center gap-1 rounded bg-zinc-700 px-2 py-1 text-[11px] font-medium text-zinc-100 transition-colors hover:bg-zinc-600">
                <RotateCcw className="h-2.5 w-2.5" />
                Restart
              </button>
              <button onClick={doStop} className="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto bg-muted/30 p-4 font-mono text-xs leading-relaxed dark:bg-zinc-900/90 dark:text-zinc-300">
        <code className="whitespace-pre">{example.code}</code>
      </pre>

      {/* Output panel */}
      {showOutput && (
        <div className="border-t dark:border-zinc-700/60">
          <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-1 dark:border-zinc-700/60 dark:bg-zinc-800/50">
            <Terminal className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">console output</span>
            {runState === "running" && <Loader2 className="ml-0.5 h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="min-h-10 bg-zinc-950 p-3 font-mono text-xs">
            {output.length === 0 && runState === "running" && <span className="text-zinc-500">Running…</span>}
            {output.map((line, i) => (
              <div
                key={i}
                className={cn("whitespace-pre-wrap break-all leading-[1.65]", line.startsWith("✖") ? "text-red-400" : line.startsWith("⚠") ? "text-yellow-400" : "text-green-300")}>
                {line || " "}
              </div>
            ))}
            {errorMsg && <div className="mt-1 text-red-400">✖ {errorMsg}</div>}
            {output.length === 0 && runState === "done" && <span className="text-zinc-500">(no output)</span>}
          </div>
        </div>
      )}

      {/* Hidden sandbox iframe — key forces remount on each run */}
      {iframeActive && <iframe key={runKey} sandbox="allow-scripts" srcDoc={buildSrcdoc(example.code, instanceId)} className="hidden" title="code-runner" aria-hidden="true" />}
    </div>
  );
}
