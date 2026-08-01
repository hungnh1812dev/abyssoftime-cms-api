"use client";

import { ArrowLeft, BookOpen, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { fetchWordDetail } from "@/app/actions/en-vocab-actions";
import { cn } from "@/lib/utils";
import { AudioButton } from "@/views/learning/english-v2/components/AudioButton";
import { parsePOS, POS_LABEL, POS_STYLE } from "@/views/learning/english-v2/en-vocab-v2.types";
import type { LearnedWordEntry, VocabWord } from "@/views/learning/english-v2/en-vocab-v2.types";
import { useLearnedWords } from "@/views/learning/english-v2/hooks/useLearnedWords";

type GameStatus = "idle" | "playing" | "correct" | "wrong" | "revealed" | "batchComplete" | "finished";

const BATCH_SIZE = 30;

interface GameState {
  status: GameStatus;
  fullPool: LearnedWordEntry[]; // full shuffled set of learned words for this run
  offset: number; // how many words of fullPool have been consumed into batches so far
  pool: LearnedWordEntry[]; // current batch being played
  cursor: number;
  errorCount: number;
  input: string;
  shake: boolean;
}

type GameAction =
  | { type: "START"; words: LearnedWordEntry[] }
  | { type: "SUBMIT" }
  | { type: "NEXT" }
  | { type: "NEXT_BATCH" }
  | { type: "RESTART" }
  | { type: "SET_INPUT"; value: string }
  | { type: "CLEAR_SHAKE" };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START": {
      const fullPool = shuffle(action.words);
      const pool = fullPool.slice(0, BATCH_SIZE);
      return { status: "playing", fullPool, offset: pool.length, pool, cursor: 0, errorCount: 0, input: "", shake: false };
    }

    case "SET_INPUT":
      return { ...state, input: action.value };

    case "SUBMIT": {
      if (state.status !== "playing") return state;
      const current = state.pool[state.cursor];
      if (!current) return state;
      const correct = normalize(state.input) === normalize(current.word);
      if (correct) return { ...state, status: "correct", shake: false };
      const newErrors = state.errorCount + 1;
      if (newErrors >= 3) return { ...state, status: "revealed", errorCount: newErrors, shake: true };
      return { ...state, status: "wrong", errorCount: newErrors, input: "", shake: true };
    }

    case "CLEAR_SHAKE":
      return { ...state, shake: false, status: state.status === "wrong" ? "playing" : state.status };

    case "NEXT": {
      const next = state.cursor + 1;
      if (next >= state.pool.length) {
        const hasMore = state.offset < state.fullPool.length;
        return { ...state, status: hasMore ? "batchComplete" : "finished", cursor: next, input: "", shake: false };
      }
      return { ...state, status: "playing", cursor: next, errorCount: 0, input: "", shake: false };
    }

    case "NEXT_BATCH": {
      const pool = state.fullPool.slice(state.offset, state.offset + BATCH_SIZE);
      return { ...state, status: "playing", pool, offset: state.offset + pool.length, cursor: 0, errorCount: 0, input: "", shake: false };
    }

    case "RESTART": {
      const fullPool = shuffle(state.fullPool);
      const pool = fullPool.slice(0, BATCH_SIZE);
      return { ...state, status: "playing", fullPool, offset: pool.length, pool, cursor: 0, errorCount: 0, input: "", shake: false };
    }

    default:
      return state;
  }
}

const INIT: GameState = { status: "idle", fullPool: [], offset: 0, pool: [], cursor: 0, errorCount: 0, input: "", shake: false };

export function GamePage() {
  const { locale } = useParams<{ locale: string }>();
  const { getAllLearnedWords } = useLearnedWords();
  const [state, dispatch] = useReducer(reducer, INIT);
  const [showDetails, setShowDetails] = useState(false);
  const [detailWord, setDetailWord] = useState<VocabWord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "playing") {
      setShowDetails(false);
      setDetailWord(null);
      inputRef.current?.focus();
    }
  }, [state.status, state.cursor]);

  useEffect(() => {
    if (state.shake) {
      const t = setTimeout(() => dispatch({ type: "CLEAR_SHAKE" }), 400);
      return () => clearTimeout(t);
    }
  }, [state.shake]);

  const handleToggleDetails = useCallback(async () => {
    const next = !showDetails;
    setShowDetails(next);
    const current = state.pool[state.cursor];
    if (next && !detailWord && current) {
      setDetailLoading(true);
      try {
        const word = await fetchWordDetail(current.word);
        setDetailWord(word);
      } finally {
        setDetailLoading(false);
      }
    }
  }, [showDetails, detailWord, state.pool, state.cursor]);

  function handleStart() {
    dispatch({ type: "START", words: getAllLearnedWords() });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: "SUBMIT" });
  }

  function handleNext() {
    setShowDetails(false);
    setDetailWord(null);
    dispatch({ type: "NEXT" });
  }

  function handleNextBatch() {
    setShowDetails(false);
    setDetailWord(null);
    dispatch({ type: "NEXT_BATCH" });
  }

  const current = state.pool[state.cursor] ?? null;

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (state.status === "idle") {
    const count = getAllLearnedWords().length;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <BackLink locale={locale} />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-3xl font-extrabold text-white">🎮</div>
        <h1 className="text-2xl font-extrabold tracking-tight">Word Recall Game</h1>
        <p className="max-w-xs text-center text-sm text-slate-500 dark:text-slate-400">
          {count === 0
            ? "You have no learned words yet. Go back and mark some words as Learned first."
            : `You have ${count} learned word${count > 1 ? "s" : ""}. Can you type them all from memory?`}
        </p>
        <button
          onClick={handleStart}
          disabled={count === 0}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-8 py-3 font-bold text-white transition-opacity disabled:opacity-40">
          Start Game
        </button>
      </div>
    );
  }

  // ── Batch complete (more words left) ────────────────────────────────────────
  if (state.status === "batchComplete") {
    const remaining = state.fullPool.length - state.offset;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <BackLink locale={locale} />
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-extrabold tracking-tight">Batch Complete!</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You practised {state.pool.length} words. {remaining} word{remaining > 1 ? "s" : ""} left.
        </p>
        <button onClick={handleNextBatch} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-8 py-3 font-bold text-white">
          Play More ({Math.min(BATCH_SIZE, remaining)} words) <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (state.status === "finished") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <BackLink locale={locale} />
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-extrabold tracking-tight">Game Over!</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">You practised all {state.fullPool.length} words.</p>
        <button
          onClick={() => dispatch({ type: "RESTART" })}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-8 py-3 font-bold text-white">
          <RefreshCw className="h-4 w-4" />
          Play Again
        </button>
      </div>
    );
  }

  // ── Playing / Wrong / Correct / Revealed ──────────────────────────────────
  if (!current) return null;

  const isCorrect = state.status === "correct";
  const isRevealed = state.status === "revealed";
  const showNext = isCorrect || isRevealed;

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-4">
          <BackLink locale={locale} />
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {state.cursor + 1} / {state.pool.length}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        {/* Progress bar */}
        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
            style={{ width: `${((state.cursor + 1) / state.pool.length) * 100}%` }}
          />
        </div>

        {/* Meaning hint panel */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-900">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">What word has this meaning?</p>
          <p className="text-sm text-slate-700 dark:text-slate-500">{current.meaning?.en}</p>
          <p className="text-sm text-slate-500 dark:text-slate-300">{current.meaning?.vi}</p>
        </div>

        {/* Answer input */}
        {!showNext && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              ref={inputRef}
              value={state.input}
              onChange={(e) => dispatch({ type: "SET_INPUT", value: e.target.value })}
              placeholder="Type the word…"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={`w-full rounded-xl border px-4 py-3 text-lg font-semibold tracking-wide outline-none transition-all ${
                state.shake
                  ? "animate-[shake_0.35s_ease-in-out] border-red-400 bg-red-50 text-red-600 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-300"
                  : "border-slate-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-slate-900 dark:focus:border-blue-500"
              }`}
            />
            {state.errorCount > 0 && <p className="text-center text-xs text-red-500 dark:text-red-400">Wrong — attempt {state.errorCount}/3</p>}
            <button type="submit" className="rounded-xl bg-blue-500 py-3 font-bold text-white transition-colors hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500">
              Submit
            </button>
          </form>
        )}

        {/* Correct feedback */}
        {isCorrect && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">✓ Correct!</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">{current.word}</p>
          </div>
        )}

        {/* Revealed feedback */}
        {isRevealed && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-sm font-medium text-red-500 dark:text-red-400">The answer was:</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">{current.word}</p>
          </div>
        )}

        {/* View full card toggle — only after answer is known */}
        {showNext && (
          <button
            onClick={handleToggleDetails}
            className={cn(
              "mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all",
              showDetails
                ? "border-blue-500/40 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            )}>
            <BookOpen className="h-4 w-4" />
            {showDetails ? "Hide details" : "View full word card"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")} />
          </button>
        )}

        {/* Full word card details panel */}
        {showNext &&
          showDetails &&
          (detailLoading ? (
            <div className="mt-3 flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : detailWord ? (
            <WordDetailPanel word={detailWord} />
          ) : null)}

        {/* Next button */}
        {showNext && (
          <button
            onClick={handleNext}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 py-3 font-bold text-white">
            Next Word <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </main>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
      `}</style>
    </div>
  );
}

// ── Word detail panel ─────────────────────────────────────────────────────────

interface WordDetailPanelProps {
  word: VocabWord;
}

function WordDetailPanel({ word }: WordDetailPanelProps) {
  const posList = parsePOS(word.partsOfSpeech);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-500/20">
      {/* Header: word + phonetics + POS */}
      <div className="border-b border-slate-100 bg-blue-50/60 px-5 py-4 dark:border-white/5 dark:bg-blue-500/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{word.word}</h2>
            <div className="mt-1 flex flex-col gap-1.5">
              {word.phonetics.map((phon, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-sm text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">{phon.ipa}</span>
                  {phon.source && <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{phon.source}</span>}
                  <AudioButton word={word.word} audioUrl={phon.audio} />
                  {i === 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {phon.syllableParts.map((p, si) => (
                        <span key={si}>
                          {si > 0 && " · "}
                          {p.stressed ? <strong className="font-bold text-amber-600 dark:text-amber-300">{p.text}</strong> : p.text}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
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

      <div className="flex flex-col gap-5 px-5 py-5">
        {/* Examples */}
        {word.examples.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Ví dụ</p>
            <ul className="flex flex-col gap-2">
              {word.examples.map((ex, i) => (
                <li key={i} className="border-l-2 border-blue-300 pl-3 dark:border-blue-500/40">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ex.en}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{ex.vi}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Phrases */}
        {word.phrases.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cụm từ</p>
            <ul className="flex flex-col gap-1.5">
              {word.phrases.map((ph, i) => (
                <li key={i} className="flex flex-col text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{ph.en}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{ph.vi}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Synonyms / Antonyms */}
        {(word.synonyms || word.antonyms) && (
          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4 dark:border-white/5">
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
    </div>
  );
}

function BackLink({ locale }: { locale: string }) {
  return (
    <Link
      href={`/${locale}/learning/english`}
      className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
      <ArrowLeft className="h-4 w-4" />
      Back
    </Link>
  );
}
