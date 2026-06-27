import { unstable_noStore as noStore } from "next/cache";
import { getDemoLeaderboard, getDemoProfileStats, demoMatch, demoProfiles } from "./mock-data";
import { createSupabaseServerClient } from "./supabase/server";
import { tierForElo } from "./domain/tiers";
import type { LeaderboardEntry, MatchSummary, Profile, ProfileStats, RatingEvent, TossupResult } from "./domain/types";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

type ProfileRow = {
  id: string;
  username: string;
  email?: string | null;
  elo: number;
  match_count: number;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  placement_count: number;
  category_preferences: string[] | null;
  created_at: string;
};

type MatchRow = {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  is_draw: boolean;
  difficulty: number;
  status: "completed" | "forfeit" | "cancelled";
  created_at: string;
  completed_at: string | null;
};

type TossupResultRow = {
  id: string;
  match_id: string;
  tossup_id: string;
  tossup_order: number;
  player_id: string | null;
  outcome: TossupResult["outcome"];
  buzz_word_index: number | null;
  points: number;
  was_power: boolean;
  answer_given?: string | null;
};

type RatingEventRow = {
  player_id: string;
  rating_before: number;
  rating_after: number;
  delta: number;
  expected_score: number | string;
  actual_score: number | string;
  k_factor: number;
  modifiers: string[] | null;
};

function shouldUseDemo() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    elo: row.elo,
    matchCount: row.match_count,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
    placementCount: row.placement_count,
    tier: tierForElo(row.elo),
    categoryPreferences: row.category_preferences ?? [],
    createdAt: row.created_at,
  };
}

function winRate(profile: Pick<Profile, "matchCount" | "wins" | "draws">) {
  return profile.matchCount > 0 ? (profile.wins + profile.draws * 0.5) / profile.matchCount : 0;
}

async function currentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function profilesById(supabase: SupabaseClient, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return new Map<string, Profile>();

  const { data } = await supabase.from("profiles").select("*").in("id", uniqueIds).returns<ProfileRow[]>();
  return new Map((data ?? []).map((row) => [row.id, mapProfile(row)]));
}

async function mapMatchSummary(supabase: SupabaseClient, row: MatchRow): Promise<MatchSummary | null> {
  const profileMap = await profilesById(supabase, [row.player1_id, row.player2_id]);
  const player1 = profileMap.get(row.player1_id);
  const player2 = profileMap.get(row.player2_id);
  if (!player1 || !player2) return null;

  const [{ data: tossups }, { data: ratingEvents }] = await Promise.all([
    supabase
      .from("tossup_results")
      .select("*")
      .eq("match_id", row.id)
      .order("tossup_order", { ascending: true })
      .returns<TossupResultRow[]>(),
    supabase
      .from("rating_events")
      .select("*")
      .eq("match_id", row.id)
      .order("created_at", { ascending: true })
      .returns<RatingEventRow[]>(),
  ]);

  return {
    id: row.id,
    player1,
    player2,
    player1Score: row.player1_score,
    player2Score: row.player2_score,
    winnerId: row.winner_id,
    isDraw: row.is_draw,
    difficulty: row.difficulty,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    tossups: (tossups ?? []).map((result) => ({
      id: result.id,
      matchId: result.match_id,
      tossupId: result.tossup_id,
      order: result.tossup_order,
      playerId: result.player_id,
      outcome: result.outcome,
      buzzWordIndex: result.buzz_word_index,
      points: result.points,
      wasPower: result.was_power,
      answerGiven: result.answer_given ?? undefined,
    })),
    ratingEvents: (ratingEvents ?? []).map(
      (event): RatingEvent => ({
        playerId: event.player_id,
        before: event.rating_before,
        after: event.rating_after,
        delta: event.delta,
        expectedScore: Number(event.expected_score),
        actualScore: Number(event.actual_score) as 0 | 0.5 | 1,
        kFactor: event.k_factor,
        modifiers: event.modifiers ?? [],
      }),
    ),
  };
}

export async function getCurrentUser() {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return shouldUseDemo() ? { id: demoProfiles[0].id, email: "demo@example.com" } : null;
  return currentUser(supabase);
}

export async function getCurrentProfile(): Promise<Profile | null> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return shouldUseDemo() ? demoProfiles[0] : null;

  const user = await currentUser(supabase);
  if (!user) return shouldUseDemo() ? demoProfiles[0] : null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<ProfileRow>();
  return data ? mapProfile(data) : null;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return shouldUseDemo() ? getDemoLeaderboard() : [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, elo, match_count, wins, losses, draws, placement_count, category_preferences, created_at")
    .order("elo", { ascending: false })
    .limit(100)
    .returns<ProfileRow[]>();

  if (error || !data) return shouldUseDemo() ? getDemoLeaderboard() : [];

  return data.map((row, index) => {
    const profile = mapProfile(row);
    return {
      rank: index + 1,
      id: profile.id,
      username: profile.username,
      elo: profile.elo,
      tier: profile.tier,
      matchCount: profile.matchCount,
      winRate: winRate(profile),
    };
  });
}

export async function getMatch(matchId: string): Promise<MatchSummary | null> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return shouldUseDemo() ? { ...demoMatch, id: matchId } : null;

  const { data } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle<MatchRow>();
  if (!data) return shouldUseDemo() ? { ...demoMatch, id: matchId } : null;
  return mapMatchSummary(supabase, data);
}

export async function getProfileStats(username: string): Promise<ProfileStats | null> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return shouldUseDemo() ? getDemoProfileStats(username) : null;

  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle<ProfileRow>();
  if (!data) return shouldUseDemo() ? getDemoProfileStats(username) : null;

  const profile = mapProfile(data);
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<MatchRow[]>();

  const recentMatches = (await Promise.all((matches ?? []).map((match) => mapMatchSummary(supabase, match)))).filter(
    (match): match is MatchSummary => Boolean(match),
  );

  const { data: ratingEvents } = await supabase
    .from("rating_events")
    .select("rating_after")
    .eq("player_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(50)
    .returns<Array<{ rating_after: number }>>();

  const tossupRows = recentMatches.flatMap((match) => match.tossups);
  const buzzes = tossupRows.filter((result) => result.playerId === profile.id && result.buzzWordIndex !== null);
  const playedTossups = Math.max(1, tossupRows.length);

  return {
    profile,
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    winRate: winRate(profile),
    averageBuzzPosition: buzzes.length > 0 ? Number((buzzes.reduce((sum, result) => sum + (result.buzzWordIndex ?? 0), 0) / buzzes.length).toFixed(1)) : 0,
    powerRate: tossupRows.filter((result) => result.playerId === profile.id && result.outcome === "power").length / playedTossups,
    negRate: tossupRows.filter((result) => result.playerId === profile.id && result.outcome === "neg").length / playedTossups,
    ratingHistory: [1000, ...(ratingEvents ?? []).map((event) => event.rating_after)].slice(-50),
    recentMatches,
  };
}
