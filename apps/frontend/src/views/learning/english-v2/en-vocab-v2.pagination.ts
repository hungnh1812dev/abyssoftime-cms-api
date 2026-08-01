import { GROUP_CHUNK_SIZE, GROUP_SIZE } from "./components/GroupPicker";

// Derived, not duplicated — GROUP_CHUNK_SIZE (words/group) / GROUP_SIZE (packs/group)
const PACK_WORD_SIZE = GROUP_CHUNK_SIZE / GROUP_SIZE;

export function parseIntParam(value: string | null | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : fallback;
}

export function toPackIdx(group: number, pack: number): number {
  return (group - 1) * GROUP_SIZE + pack;
}

export function fromPackIdx(packIdx: number): { group: number; pack: number } {
  const group = Math.ceil(packIdx / GROUP_SIZE);
  const pack = packIdx - (group - 1) * GROUP_SIZE;
  return { group, pack };
}

export function clampGroupPack(group: number, pack: number, totalWords: number): { group: number; pack: number } {
  const totalPacks = Math.max(1, Math.ceil(totalWords / PACK_WORD_SIZE));
  const groupCount = Math.max(1, Math.ceil(totalPacks / GROUP_SIZE));

  const clampedGroup = Math.min(Math.max(group, 1), groupCount);
  const packsInGroup = Math.min(GROUP_SIZE, totalPacks - (clampedGroup - 1) * GROUP_SIZE);
  const clampedPack = Math.min(Math.max(pack, 1), Math.max(1, packsInGroup));

  return { group: clampedGroup, pack: clampedPack };
}
