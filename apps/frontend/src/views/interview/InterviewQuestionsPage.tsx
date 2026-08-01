"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { InterviewSectionNav } from "./components/InterviewSectionNav";
import { QuestionCard } from "./components/QuestionCard";
import { ALL_SECTIONS } from "./data";

interface InterviewQuestionsPageProps {
  locale: string;
}

export function InterviewQuestionsPage({ locale }: InterviewQuestionsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(ALL_SECTIONS[0]?.id ?? "");

  const isSearching = searchQuery.trim().length > 0;

  const displaySections = useMemo(() => {
    if (!isSearching) {
      return ALL_SECTIONS.filter((s) => s.id === activeSectionId);
    }
    const q = searchQuery.toLowerCase();
    return ALL_SECTIONS.map((s) => ({
      ...s,
      questions: s.questions.filter((item) => item.question.toLowerCase().includes(q) || (item.tags ?? []).some((t) => t.toLowerCase().includes(q))),
    })).filter((s) => s.questions.length > 0);
  }, [searchQuery, activeSectionId, isSearching]);

  const totalQuestions = ALL_SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r bg-background dark:border-border/60 md:flex md:w-56 lg:w-64">
        <div className="border-b p-3 dark:border-border/60">
          <h2 className="text-sm font-semibold text-foreground">Interview Questions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalQuestions} questions · {ALL_SECTIONS.length} sections
          </p>
        </div>
        <InterviewSectionNav
          sections={ALL_SECTIONS}
          activeSectionId={activeSectionId}
          onSelect={(id) => {
            setActiveSectionId(id);
            setSearchQuery("");
          }}
        />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur dark:border-border/60 dark:bg-background/90">
          {/* Mobile chips */}
          <div className="mb-2 md:hidden">
            <InterviewSectionNav
              sections={ALL_SECTIONS}
              activeSectionId={activeSectionId}
              onSelect={(id) => {
                setActiveSectionId(id);
                setSearchQuery("");
              }}
              mobile
            />
          </div>

          {/* Search + link */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions…"
                className="w-full rounded-md border bg-muted/50 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring dark:border-border/60 dark:bg-muted/30"
              />
            </div>
            <Link
              href={`/${locale}/interview/answers`}
              className="shrink-0 rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-border/60">
              View with Answers →
            </Link>
          </div>

          {isSearching && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {displaySections.reduce((a, s) => a + s.questions.length, 0)} result
              {displaySections.reduce((a, s) => a + s.questions.length, 0) !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>

        {/* Question list */}
        <div className="px-4 py-6 md:px-8">
          {displaySections.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg text-muted-foreground">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground/70">Try a different keyword</p>
            </div>
          ) : (
            <div className="space-y-8">
              {displaySections.map((section) => (
                <div key={section.id}>
                  {/* Section header */}
                  <div className={cn("mb-3 rounded-xl border p-3", section.bgColor)}>
                    <div className="flex items-center justify-between">
                      <h2 className={cn("text-sm font-semibold", section.color)}>{section.label}</h2>
                      <span className="rounded-full bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-background/40">
                        {section.questions.length} Q
                      </span>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-2">
                    {section.questions.map((q) => (
                      <QuestionCard key={q.id} question={q} sectionColor={section.color} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
