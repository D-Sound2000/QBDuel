export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master";

export type TossupOutcome = "power" | "correct" | "neg" | "miss";

export type MatchStatus = "waiting" | "matched" | "countdown" | "reading" | "buzzed" | "answering" | "result" | "ended";

export type AnswerJudgment = "correct" | "incorrect" | "prompt";

export interface Profile {
  id: string;
  username: string;
  email?: string;
  elo: number;
  matchCount: number;
  placementCount: number;
  tier: Tier;
  categoryPreferences: string[];
  createdAt: string;
}

export interface Tossup {
  id: string;
  text: string;
  answer: string;
  difficulty: number;
  category: string;
  tournament?: string;
  powerMarkIndex: number;
  words: string[];
}

export interface TossupResult {
  id: string;
  matchId: string;
  tossupId: string;
  order: number;
  playerId: string | null;
  outcome: TossupOutcome;
  buzzWordIndex: number | null;
  points: number;
  wasPower: boolean;
  answerGiven?: string;
}

export interface RatingEvent {
  playerId: string;
  before: number;
  after: number;
  delta: number;
  expectedScore: number;
  actualScore: 0 | 0.5 | 1;
  kFactor: number;
  modifiers: string[];
}

export interface MatchSummary {
  id: string;
  player1: Profile;
  player2: Profile;
  player1Score: number;
  player2Score: number;
  winnerId: string | null;
  isDraw: boolean;
  difficulty: number;
  status: "completed" | "forfeit" | "cancelled";
  createdAt: string;
  completedAt: string | null;
  tossups: TossupResult[];
  ratingEvents: RatingEvent[];
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  elo: number;
  tier: Tier;
  matchCount: number;
  winRate: number;
}

export interface ProfileStats {
  profile: Profile;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageBuzzPosition: number;
  powerRate: number;
  negRate: number;
  ratingHistory: number[];
  recentMatches: MatchSummary[];
}
