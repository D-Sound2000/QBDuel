import { afterEach, describe, expect, it, vi } from "vitest";
import { judgeAnswerFallback, normalizeAnswer } from "@/lib/domain/answer";
import { difficultyForAverageElo } from "@/lib/domain/difficulty";
import { calculateElo, expectedScore, kFactor } from "@/lib/domain/elo";
import { matchTossupCount, normalizeReadingWpm, wordDelayMsForWpm } from "@/lib/domain/match-config";
import { findPowerMarkIndex, normalizeTossup, tokenizeTossup } from "@/lib/domain/tossup";
import { QbReaderClient } from "@/server/qbreader";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ELO", () => {
  it("calculates expected scores symmetrically", () => {
    const a = expectedScore(1000, 1200);
    const b = expectedScore(1200, 1000);
    expect(Number((a + b).toFixed(5))).toBe(1);
  });

  it("selects K-factor by match count", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(30)).toBe(24);
    expect(kFactor(151)).toBe(16);
  });

  it("applies upset and power streak modifiers to wins", () => {
    const result = calculateElo({
      playerElo: 1000,
      opponentElo: 1200,
      playerMatchCount: 10,
      actualScore: 1,
      upsetWin: true,
      powerStreak: true,
    });

    expect(result.delta).toBeGreaterThan(30);
    expect(result.modifiers).toEqual(["upset-win", "power-streak"]);
  });
});

describe("difficulty", () => {
  it("maps average ELO to QBReader difficulty brackets", () => {
    expect(difficultyForAverageElo(1000, 1080).difficulties).toEqual([4, 5]);
    expect(difficultyForAverageElo(1400, 1500).difficulties).toEqual([8, 9]);
  });
});

describe("tossup parsing", () => {
  it("tokenizes tossups and locates the power mark", () => {
    const words = tokenizeTossup("One two (*) three");
    expect(words).toEqual(["One", "two", "(*)", "three"]);
    expect(findPowerMarkIndex(words)).toBe(2);
  });

  it("normalizes QBReader sanitized fields and preserves answerline", () => {
    const tossup = normalizeTossup({
      _id: "abc",
      question: "<b>Bad HTML (*) clue</b>",
      question_sanitized: "Clean (*) clue",
      answer: "<b><u>Crimean</u></b> War",
      answer_sanitized: "Crimean War",
      difficulty: 4,
      category: "History",
    });

    expect(tossup.text).toBe("Clean (*) clue");
    expect(tossup.answer).toBe("Crimean War");
    expect(tossup.answerLine).toBe("Crimean War");
    expect(tossup.powerMarkIndex).toBe(1);
  });
});

describe("match config", () => {
  it("ships the ranked v1 format as seven tossups", () => {
    expect(matchTossupCount).toBe(7);
  });

  it("maps reader WPM to per-word timing", () => {
    expect(wordDelayMsForWpm(200)).toBe(300);
    expect(normalizeReadingWpm(150)).toBe(150);
    expect(normalizeReadingWpm(123)).toBe(180);
  });
});

describe("answer fallback", () => {
  it("normalizes punctuation and parentheticals", () => {
    expect(normalizeAnswer("Virginia Woolf (accept Adeline Virginia Woolf)")).toBe("virginia woolf");
  });

  it("accepts straightforward answerline matches", () => {
    expect(judgeAnswerFallback("Virginia Woolf", "Virginia Woolf")).toBe("correct");
  });

  it("prompts on partial answers", () => {
    expect(judgeAnswerFallback("Woolf", "Virginia Woolf")).toBe("prompt");
  });

  it("maps QBReader accept directives to correct", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ directive: "accept" }),
      })),
    );

    await expect(new QbReaderClient("https://example.test").checkAnswer("Crimean", "Crimean War")).resolves.toBe("correct");
  });
});
