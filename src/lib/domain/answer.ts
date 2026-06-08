import type { AnswerJudgment } from "./types";

const bracketedInstruction = /\[(?:accept|prompt|do not accept)[^\]]+\]/gi;
const parenthetical = /\([^)]*\)/g;
const punctuation = /[^\p{L}\p{N}\s]/gu;

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(bracketedInstruction, " ")
    .replace(parenthetical, " ")
    .replace(punctuation, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function judgeAnswerFallback(given: string, answerLine: string): AnswerJudgment {
  const normalizedGiven = normalizeAnswer(given);
  const normalizedAnswer = normalizeAnswer(answerLine);

  if (!normalizedGiven) return "incorrect";
  if (normalizedGiven === normalizedAnswer) return "correct";
  if (normalizedAnswer.includes(normalizedGiven) && normalizedGiven.length >= 4) return "prompt";
  if (normalizedGiven.includes(normalizedAnswer) && normalizedAnswer.length >= 4) return "correct";

  const accepted = answerLine.match(/\[(?:accept|or accept):\s*([^\]]+)\]/gi) ?? [];
  for (const entry of accepted) {
    const option = normalizeAnswer(entry.replace(/\[(?:accept|or accept):/i, "").replace("]", ""));
    if (option && (normalizedGiven === option || normalizedGiven.includes(option))) {
      return "correct";
    }
  }

  return "incorrect";
}
