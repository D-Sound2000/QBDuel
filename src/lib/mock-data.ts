import { tierForElo } from "./domain/tiers";
import type { LeaderboardEntry, MatchSummary, Profile, ProfileStats } from "./domain/types";

export const demoProfiles: Profile[] = [
  {
    id: "demo-you",
    username: "dhruv",
    elo: 1186,
    matchCount: 18,
    placementCount: 5,
    tier: tierForElo(1186),
    categoryPreferences: ["Literature", "History", "Science"],
    createdAt: new Date("2026-06-01T12:00:00Z").toISOString(),
  },
  {
    id: "demo-rival",
    username: "neginator",
    elo: 1224,
    matchCount: 43,
    placementCount: 5,
    tier: tierForElo(1224),
    categoryPreferences: ["Science", "Fine Arts"],
    createdAt: new Date("2026-05-20T12:00:00Z").toISOString(),
  },
  {
    id: "demo-leader",
    username: "powerline",
    elo: 1462,
    matchCount: 188,
    placementCount: 5,
    tier: tierForElo(1462),
    categoryPreferences: ["History"],
    createdAt: new Date("2026-04-12T12:00:00Z").toISOString(),
  },
];

export const demoMatch: MatchSummary = {
  id: "match-demo-001",
  player1: demoProfiles[0],
  player2: demoProfiles[1],
  player1Score: 55,
  player2Score: 35,
  winnerId: "demo-you",
  isDraw: false,
  difficulty: 6,
  status: "completed",
  createdAt: new Date("2026-06-07T20:30:00Z").toISOString(),
  completedAt: new Date("2026-06-07T20:42:00Z").toISOString(),
  tossups: [
    { id: "tr-1", matchId: "match-demo-001", tossupId: "q-1", order: 1, playerId: "demo-you", outcome: "power", buzzWordIndex: 11, points: 15, wasPower: true, answerGiven: "Woolf" },
    { id: "tr-2", matchId: "match-demo-001", tossupId: "q-2", order: 2, playerId: "demo-rival", outcome: "correct", buzzWordIndex: 31, points: 10, wasPower: false, answerGiven: "electron" },
    { id: "tr-3", matchId: "match-demo-001", tossupId: "q-3", order: 3, playerId: "demo-you", outcome: "neg", buzzWordIndex: 14, points: -5, wasPower: false, answerGiven: "Bismarck" },
    { id: "tr-4", matchId: "match-demo-001", tossupId: "q-4", order: 4, playerId: "demo-you", outcome: "correct", buzzWordIndex: 27, points: 10, wasPower: false, answerGiven: "Ghana" },
  ],
  ratingEvents: [
    { playerId: "demo-you", before: 1165, after: 1186, delta: 21, expectedScore: 0.46, actualScore: 1, kFactor: 40, modifiers: ["upset-win"] },
    { playerId: "demo-rival", before: 1241, after: 1224, delta: -17, expectedScore: 0.54, actualScore: 0, kFactor: 24, modifiers: [] },
  ],
};

export function getDemoLeaderboard(): LeaderboardEntry[] {
  return [...demoProfiles]
    .sort((a, b) => b.elo - a.elo)
    .map((profile, index) => ({
      rank: index + 1,
      id: profile.id,
      username: profile.username,
      elo: profile.elo,
      tier: profile.tier,
      matchCount: profile.matchCount,
      winRate: profile.id === "demo-leader" ? 0.68 : profile.id === "demo-you" ? 0.61 : 0.56,
    }));
}

export function getDemoProfileStats(username = "dhruv"): ProfileStats {
  const profile = demoProfiles.find((entry) => entry.username === username) ?? demoProfiles[0];

  return {
    profile,
    wins: 11,
    losses: 7,
    draws: 0,
    winRate: 0.61,
    averageBuzzPosition: 24.8,
    powerRate: 0.18,
    negRate: 0.11,
    ratingHistory: [1000, 1034, 1051, 1098, 1120, 1165, profile.elo],
    recentMatches: [demoMatch],
  };
}
