import { qbReaderBaseUrl } from "@/lib/env";
import { judgeAnswerFallback } from "@/lib/domain/answer";
import { normalizeTossup } from "@/lib/domain/tossup";
import type { AnswerJudgment, Tossup } from "@/lib/domain/types";

interface RandomTossupResponse {
  tossups?: Array<{
    _id?: string;
    question?: string;
    answer: string;
    difficulty?: number;
    category?: string;
    tournament?: string;
  }>;
}

export class QbReaderClient {
  constructor(private readonly baseUrl = qbReaderBaseUrl) {}

  async randomTossups(difficulties: number[], number: number, seenIds = new Set<string>()): Promise<Tossup[]> {
    const url = new URL(`${this.baseUrl}/random-tossup`);
    url.searchParams.set("difficulties", difficulties.join(","));
    url.searchParams.set("number", String(number));
    url.searchParams.set("standardOnly", "true");
    url.searchParams.set("powermarkOnly", "true");

    const response = await fetch(url);
    if (!response.ok) throw new Error(`QBReader random-tossup failed: ${response.status}`);

    const payload = (await response.json()) as RandomTossupResponse;
    return (payload.tossups ?? []).map(normalizeTossup).filter((tossup) => !seenIds.has(tossup.id));
  }

  async checkAnswer(given: string, answerLine: string): Promise<AnswerJudgment> {
    try {
      const url = new URL(`${this.baseUrl}/check-answer`);
      url.searchParams.set("answerline", answerLine);
      url.searchParams.set("givenAnswer", given);
      const response = await fetch(url);
      if (!response.ok) return judgeAnswerFallback(given, answerLine);

      const payload = (await response.json()) as { directive?: string; result?: string };
      const result = (payload.directive ?? payload.result ?? "").toLowerCase();
      if (result.includes("prompt")) return "prompt";
      if (result.includes("correct")) return "correct";
      return "incorrect";
    } catch {
      return judgeAnswerFallback(given, answerLine);
    }
  }
}
