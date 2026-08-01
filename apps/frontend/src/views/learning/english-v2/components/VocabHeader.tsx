"use client";

import { Gamepad2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { VocabPackPage } from "@/views/learning/english-v2/en-vocab-v2.types";

import { GROUP_SIZE, GroupPicker } from "./GroupPicker";
import { PackPicker } from "./PackPicker";

interface VocabHeaderProps {
  group: VocabPackPage | undefined;
  activeGroup: number; // 0-based index
  activePack: number; // 0-based index
  learnedCount: number;
  totalCount: number;
  onGroupSelect: (group: number) => void;
  onPackSelect: (pack: number) => void;
  onResetLearned: () => void;
}

export function VocabHeader({ group, activeGroup, activePack, learnedCount, totalCount, onGroupSelect, onPackSelect, onResetLearned }: VocabHeaderProps) {
  const { locale } = useParams<{ locale: string }>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirmReset() {
    onResetLearned();
    setConfirmOpen(false);
  }

  function* groupIterator(items: { wordGroup: string }[], step: number = GROUP_SIZE): Generator<string> {
    for (let i = 0; i < items.length; i += step) {
      yield items[i].wordGroup || "Unknown";
    }
  }
  const packs = [...groupIterator(group?.items || [])];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 backdrop-blur-md dark:border-white/10 dark:from-slate-950 dark:to-gray-900">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-2 px-3 py-2 sm:h-16 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-0">
        {/* Mobile row 1: logo + game icon button (own row below sm; replaced by the desktop logo/game link at sm+) */}
        <div className="flex items-center justify-between gap-2 sm:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-extrabold text-white">EN</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Reset Progress"
              onClick={() => setConfirmOpen(true)}
              className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:border-rose-500/40 hover:bg-rose-50 hover:text-rose-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
              <RotateCcw className="h-4 w-4 flex-shrink-0" />
            </button>
            <Link
              href={`/${locale}/learning/english/game`}
              className="flex items-center justify-center rounded-lg border border-violet-500/30 bg-violet-50 p-2 text-violet-600 transition-all hover:border-violet-500/60 hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20">
              <Gamepad2 className="h-4 w-4 flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* Desktop logo (hidden below sm — mobile row 1 covers it) */}
        <div className="hidden flex-shrink-0 items-center gap-3 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-extrabold text-white">EN</div>
          <div>
            <p className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-200">English Vocabulary</p>
            <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">3000 từ giao tiếp</p>
          </div>
        </div>

        {/* Mobile row 2 / desktop inline: Group + Pack picker */}
        <div className="flex items-center gap-2 sm:gap-4">
          <GroupPicker totalWords={group?.meta.pagination.total || 0} activeGroup={activeGroup} onGroupSelect={onGroupSelect} />
          <PackPicker
            packs={packs}
            totalWords={group?.meta.pagination.total || 0}
            activePack={activePack}
            activeGroup={activeGroup}
            learnedCount={learnedCount}
            totalCount={totalCount}
            onPackSelect={onPackSelect}
          />
        </div>

        {/* Desktop reset + game link (hidden below sm — mobile row 1 covers it) */}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:border-rose-500/40 hover:bg-rose-50 hover:text-rose-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
            <RotateCcw className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Reset Progress</span>
          </button>
          <Link
            href={`/${locale}/learning/english/game`}
            className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-600 transition-all hover:border-violet-500/60 hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20">
            <Gamepad2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Play Game</span>
          </Link>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all learning progress?</DialogTitle>
            <DialogDescription>This clears every word marked as learned. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="rounded-lg border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-rose-700">
              Reset
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
