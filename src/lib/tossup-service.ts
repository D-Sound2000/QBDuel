import { matchTossupCount } from "./domain/match-config";
import { judgeAnswerFallback } from "./domain/answer";
import { normalizeTossup } from "./domain/tossup";
import type { AnswerJudgment, Tossup } from "./domain/types";
import { QbReaderClient } from "@/server/qbreader";

const fallbackRawTossups = [
  {
    _id: "fallback-practice-1",
    question: "This author used a lighthouse trip as the central delayed event in (*) To the Lighthouse. For 10 points, name this modernist author of Mrs Dalloway.",
    answer: "Virginia Woolf",
    difficulty: 5,
    category: "Literature",
  },
  {
    _id: "fallback-practice-2",
    question: "This empire was ruled by Mansa Musa, who made a famous pilgrimage to (*) Mecca. For 10 points, name this West African empire centered near Timbuktu.",
    answer: "Mali Empire",
    difficulty: 4,
    category: "History",
  },
  {
    _id: "fallback-practice-3",
    question: "This property appears in both orbital and spin forms and is measured in units of h-bar. For 10 points, name this conserved rotational quantity.",
    answer: "angular momentum",
    difficulty: 5,
    category: "Science",
  },
];

const client = new QbReaderClient();

function fallbackTossups(count: number) {
  return Array.from({ length: count }, (_, index) => normalizeTossup(fallbackRawTossups[index % fallbackRawTossups.length]));
}

export async function getPracticeTossups(count = matchTossupCount): Promise<Tossup[]> {
  try {
    const tossups = await client.randomTossups([4, 5, 6], count + 5, new Set());
    if (tossups.length >= count) return tossups.slice(0, count);
  } catch {
    // Local fallback keeps practice usable offline.
  }

  return fallbackTossups(count);
}

export async function getDailyTossup(): Promise<Tossup> {
  try {
    const [tossup] = await client.randomTossups([4, 5], 1, new Set());
    if (tossup) return tossup;
  } catch {
    // Local fallback keeps the dashboard rendered offline.
  }

  const dayIndex = Math.floor(Date.now() / 86_400_000) % fallbackRawTossups.length;
  return normalizeTossup(fallbackRawTossups[dayIndex]);
}

export async function judgePracticeAnswer(answer: string, answerLine: string): Promise<AnswerJudgment> {
  try {
    return await client.checkAnswer(answer, answerLine);
  } catch {
    return judgeAnswerFallback(answer, answerLine);
  }
}
