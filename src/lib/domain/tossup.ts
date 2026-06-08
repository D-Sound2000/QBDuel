import type { Tossup } from "./types";

const whitespace = /\s+/g;

export function tokenizeTossup(text: string): string[] {
  return text.replace(whitespace, " ").trim().split(" ").filter(Boolean);
}

export function findPowerMarkIndex(words: string[]): number {
  const index = words.findIndex((word) => word.includes("(*)"));
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

export function normalizeTossup(raw: {
  _id?: string;
  id?: string;
  question?: string;
  text?: string;
  answer: string;
  difficulty?: number;
  category?: string;
  tournament?: string;
}): Tossup {
  const text = raw.question ?? raw.text ?? "";
  const words = tokenizeTossup(text);

  return {
    id: raw._id ?? raw.id ?? crypto.randomUUID(),
    text,
    answer: raw.answer,
    difficulty: raw.difficulty ?? 5,
    category: raw.category ?? "Mixed",
    tournament: raw.tournament,
    powerMarkIndex: findPowerMarkIndex(words),
    words,
  };
}
