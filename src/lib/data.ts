import { unstable_noStore as noStore } from "next/cache";
import { getDemoLeaderboard, getDemoProfileStats, demoMatch, demoProfiles } from "./mock-data";
import { createSupabaseServerClient } from "./supabase/server";
import { tierForElo } from "./domain/tiers";
import type { LeaderboardEntry, MatchSummary, Profile, ProfileStats } from "./domain/types";

type ProfileRow = {
  id: string;
  username: string;
  email?: string | null;
  elo: number;
  match_count: number;
  placement_count: number;
  category_preferences: string[] | null;
  created_at: string;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? undefined,
    elo: row.elo,
    matchCount: row.match_count,
    placementCount: row.placement_count,
    tier: tierForElo(row.elo),
    categoryPreferences: row.category_preferences ?? [],
    createdAt: row.created_at,
  };
}

export async function getCurrentProfile(): Promise<Profile> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return demoProfiles[0];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return demoProfiles[0];

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single<ProfileRow>();
  return data ? mapProfile(data) : demoProfiles[0];
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getDemoLeaderboard();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, elo, match_count, placement_count")
    .gte("placement_count", 5)
    .order("elo", { ascending: false })
    .limit(100);

  if (error || !data) return getDemoLeaderboard();

  return data.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    username: row.username,
    elo: row.elo,
    tier: tierForElo(row.elo),
    matchCount: row.match_count,
    winRate: 0,
  }));
}

export async function getMatch(matchId: string): Promise<MatchSummary> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ...demoMatch, id: matchId };

  // MVP route returns demo-shaped data until the realtime server finalization path
  // is connected to Supabase RPCs in the deployment environment.
  return { ...demoMatch, id: matchId };
}

export async function getProfileStats(username: string): Promise<ProfileStats> {
  noStore();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return getDemoProfileStats(username);

  const { data } = await supabase.from("profiles").select("*").eq("username", username).single<ProfileRow>();
  if (!data) return getDemoProfileStats(username);

  return {
    ...getDemoProfileStats(username),
    profile: mapProfile(data),
  };
}
