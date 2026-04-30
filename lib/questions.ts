import questionsData from "@/data/questions.json";

export type Question = {
  id: string;
  subject: string;
  yearTerm: string;
  questionNo: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  optionImages: Record<string, string>;
  answer: string;
  correctionNote: string;
  image: string;
  imageUrl: string;
  imageType: string;
  source: { workbook: string; sheet: string };
};

export const ALL_QUESTIONS = questionsData as Question[];
export const QUESTIONS_BY_ID: Map<string, Question> = new Map(
  ALL_QUESTIONS.map((q) => [q.id, q]),
);
export const ALL_YEAR_TERMS: string[] = [
  ...new Set(ALL_QUESTIONS.map((q) => q.yearTerm)),
].sort();

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS_BY_ID.get(id);
}

// Mulberry32 deterministic RNG seeded from a string
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickQuestionsForSeed(
  seed: string,
  count = 80,
  yearTerms?: string[],
): Question[] {
  const rng = mulberry32(hashString(seed));
  const pool = yearTerms?.length
    ? ALL_QUESTIONS.filter((q) => yearTerms.includes(q.yearTerm))
    : ALL_QUESTIONS;
  const arr = [...pool];
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

export function generateSeed(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
