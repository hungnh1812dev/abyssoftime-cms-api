"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { SWRConfig } from "swr";

import { fetchPackList, fetchWordList } from "@/app/actions/en-vocab-actions";
import { clampGroupPack, parseIntParam } from "@/views/learning/english-v2/en-vocab-v2.pagination";
import type { VocabPackPage, VocabWord, VocabWordPage } from "@/views/learning/english-v2/en-vocab-v2.types";
import { useLearnedWords } from "@/views/learning/english-v2/hooks/useLearnedWords";

import { VocabHeader } from "./components/VocabHeader";
import { WordCard } from "./components/WordCard";

interface EnglishV2ViewProps {
  initialPage: VocabWordPage | null;
  initialGroup: VocabPackPage | null;
  initialGroupIdx: number; // 1-based
  initialPackIdx: number; // 1-based, within group
}

interface EnglishV2InnerProps {
  initialGroupIdx: number;
  initialPackIdx: number;
}

function EnglishV2Inner({ initialGroupIdx, initialPackIdx }: EnglishV2InnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeGroup, setActiveGroup] = useState(initialGroupIdx - 1); // 0-based index into groups[]
  const [activePack, setActivePack] = useState(initialPackIdx - 1); // 0-based index into pages[]
  const { isLearned, toggleLearned, resetLearned } = useLearnedWords();

  const groupIdx = activeGroup + 1; // 1-based index for API
  const packIdx = activeGroup * 10 + activePack + 1; // 1-based index for API
  const packKey = `en-vocab-pack-${packIdx}`;
  const groupKey = `en-vocab-group-${groupIdx}`;

  const { data: packWord, isLoading: isPackLoading } = useSWR(packKey, () => fetchWordList(packIdx), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  });

  const { data: groupPack, isLoading: isGroupLoading } = useSWR(groupKey, () => fetchPackList(groupIdx), {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  });

  function writeGroupPackToUrl(group: number, pack: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("group", String(group));
    params.set("pack", String(pack));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleGroupSelect(index: number) {
    setActiveGroup(index);
    setActivePack(0);
    writeGroupPackToUrl(index + 1, 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePackSelect(index: number) {
    setActivePack(index);
    writeGroupPackToUrl(activeGroup + 1, index + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // URL -> state: browser back/forward and manual URL edits change the visible pack.
  useEffect(() => {
    const urlGroup = parseIntParam(searchParams.get("group"), activeGroup + 1);
    const urlPack = parseIntParam(searchParams.get("pack"), activePack + 1);
    if (urlGroup - 1 !== activeGroup) setActiveGroup(urlGroup - 1);
    if (urlPack - 1 !== activePack) setActivePack(urlPack - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Once the true total word count is known, clamp out-of-range group/pack and correct the URL.
  useEffect(() => {
    if (!groupPack) return;
    const { group: clampedGroup, pack: clampedPack } = clampGroupPack(activeGroup + 1, activePack + 1, groupPack.meta.pagination.total);
    if (clampedGroup - 1 !== activeGroup || clampedPack - 1 !== activePack) {
      setActiveGroup(clampedGroup - 1);
      setActivePack(clampedPack - 1);
      writeGroupPackToUrl(clampedGroup, clampedPack);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupPack, activeGroup, activePack]);

  const words: VocabWord[] = packWord?.items ?? [];
  const learnedCount = words.filter((word) => isLearned(word.word)).length;
  const totalCount = words.length;

  return (
    <div className="min-h-screen bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      <VocabHeader
        group={groupPack}
        activeGroup={activeGroup}
        activePack={activePack}
        learnedCount={learnedCount}
        totalCount={totalCount}
        onGroupSelect={handleGroupSelect}
        onPackSelect={handlePackSelect}
        onResetLearned={resetLearned}
      />

      <main className="mx-auto max-w-screen-xl px-4 py-8">
        {isPackLoading || isGroupLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {words.map((word) => (
              <WordCard key={word.word} word={word} isLearned={isLearned(word.word)} onToggleLearned={toggleLearned} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export function EnglishV2View({ initialPage, initialGroup, initialGroupIdx, initialPackIdx }: EnglishV2ViewProps) {
  const fallback =
    initialPage && initialGroup
      ? {
          [`en-vocab-pack-${initialPage.meta.pagination.page}`]: initialPage,
          [`en-vocab-group-${initialGroup.meta.pagination.page}`]: initialGroup,
        }
      : {};

  return (
    <SWRConfig value={{ fallback }}>
      <EnglishV2Inner initialGroupIdx={initialGroupIdx} initialPackIdx={initialPackIdx} />
    </SWRConfig>
  );
}
