import type { Tossup } from "./types";

const whitespace = /\s+/g;
const htmlTag = /<[^>]+>/g;

export function stripQuestionHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(htmlTag, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(whitespace, " ")
    .trim();
}

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
  question_sanitized?: string;
  text?: string;
  answer: string;
  answer_sanitized?: string;
  difficulty?: number;
  category?: string;
  tournament?: string;
}): Tossup {
  const text = stripQuestionHtml(raw.question_sanitized ?? raw.question ?? raw.text ?? "");
  const answer = stripQuestionHtml(raw.answer_sanitized ?? raw.answer);
  const words = tokenizeTossup(text);

  return {
    id: raw._id ?? raw.id ?? crypto.randomUUID(),
    text,
    answer,
    answerLine: stripQuestionHtml(raw.answer),
    difficulty: raw.difficulty ?? 5,
    category: raw.category ?? "Mixed",
    tournament: raw.tournament,
    powerMarkIndex: findPowerMarkIndex(words),
    words,
  };
}
