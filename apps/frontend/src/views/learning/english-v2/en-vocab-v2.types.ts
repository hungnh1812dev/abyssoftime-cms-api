export interface SyllablePart {
  text: string;
  stressed: boolean;
}

export interface Phonetics {
  ipa: string;
  source: string;
  audio: string | null | undefined;
  syllableParts: SyllablePart[];
  syllableNote?: string;
}

export interface Meaning {
  posLabel: string;
  en: string;
  vi: string;
}

export interface Example {
  en: string;
  vi: string;
}

export interface Phrase {
  en: string;
  vi: string;
}

export interface VocabWord {
  word: string;
  phonetics: Phonetics[];
  partsOfSpeech: string; // comma-separated, e.g. "excl, noun, verb"
  meanings: Meaning[];
  examples: Example[];
  phrases: Phrase[];
  wordGroup: string;
  searchKeywords: string;
  synonyms: string;
  antonyms: string;
}

export interface VocabWordPage {
  items: VocabWord[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
}
export interface VocabPackPage {
  items: { wordGroup: string }[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
}

export interface LearnedWordEntry {
  word: string;
  meaning: Meaning; // primary English meaning (meanings[0])
  ipa: string; // primary IPA (phonetics.ipa)
}

// POS badge styling — keyed by trimmed token from the partsOfSpeech string
export const POS_STYLE: Record<string, string> = {
  noun: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  verb: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  adj: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  adv: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  excl: "bg-red-500/15 text-red-700 dark:text-red-300",
  phrase: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  modal: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  prep: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

export const POS_LABEL: Record<string, string> = {
  noun: "danh từ",
  verb: "động từ",
  adj: "tính từ",
  adv: "trạng từ",
  excl: "thán từ",
  phrase: "cụm từ",
  modal: "trợ động từ",
  prep: "giới từ",
};

export function parsePOS(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
