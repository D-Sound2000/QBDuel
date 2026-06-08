import type { Profile, Tossup, TossupResult, RatingEvent } from "@/lib/domain/types";

export interface QueuePlayer {
  id: string;
  username: string;
  elo: number;
  matchCount: number;
  placementCount: number;
  socketId: string;
  queuedAt: number;
}

export interface MatchPlayer extends QueuePlayer {
  score: number;
  powers: number;
  negs: number;
  connected: boolean;
}

export interface ActiveMatch {
  id: string;
  players: [MatchPlayer, MatchPlayer];
  tossups: Tossup[];
  tossupIndex: number;
  wordIndex: number;
  phase: "matched" | "countdown" | "reading" | "answering" | "ended";
  currentBuzzPlayerId: string | null;
  answeredPlayerIds: Set<string>;
  results: TossupResult[];
  timers: NodeJS.Timeout[];
  createdAt: number;
}

export interface MatchRepository {
  getProfile(player: QueuePlayer): Promise<Profile>;
  getTossups(difficulties: number[], count: number, seenIds: Set<string>): Promise<Tossup[]>;
  judgeAnswer(given: string, answerLine: string): Promise<"correct" | "incorrect" | "prompt">;
  finalizeMatch(match: ActiveMatch, ratingEvents: RatingEvent[]): Promise<void>;
}
