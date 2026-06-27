import { calculateElo } from "@/lib/domain/elo";
import { tierForElo } from "@/lib/domain/tiers";
import { normalizeTossup } from "@/lib/domain/tossup";
import type { Profile, RatingEvent, Tossup } from "@/lib/domain/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { QbReaderClient } from "./qbreader";
import type { ActiveMatch, MatchRepository, QueuePlayer } from "./types";

const fallbackTossups = [
  {
    _id: "fallback-1",
    question: "This author used a lighthouse trip as the central delayed event in (*) To the Lighthouse. For 10 points, name this modernist author of Mrs Dalloway.",
    answer: "Virginia Woolf",
    difficulty: 5,
    category: "Literature",
  },
  {
    _id: "fallback-2",
    question: "This quantity is quantized in the Bohr model and appears with principal and azimuthal forms. For 10 points, name this property measured in units of h-bar.",
    answer: "angular momentum",
    difficulty: 5,
    category: "Science",
  },
  {
    _id: "fallback-3",
    question: "This empire was ruled by Mansa Musa, who made a famous pilgrimage to (*) Mecca. For 10 points, name this West African empire centered near Timbuktu.",
    answer: "Mali Empire",
    difficulty: 4,
    category: "History",
  },
];

export class HybridRepository implements MatchRepository {
  private readonly qbreader = new QbReaderClient();
  private readonly supabase = createSupabaseAdminClient();

  async getProfile(player: QueuePlayer): Promise<Profile> {
    if (!this.supabase) {
      return {
        id: player.id,
        username: player.username,
        elo: player.elo,
        matchCount: player.matchCount,
        wins: 0,
        losses: 0,
        draws: 0,
        placementCount: player.placementCount,
        tier: tierForElo(player.elo),
        categoryPreferences: [],
        createdAt: new Date().toISOString(),
      };
    }

    const { data } = await this.supabase.from("profiles").select("*").eq("id", player.id).single();
    if (!data) {
      return {
        id: player.id,
        username: player.username,
        elo: player.elo,
        matchCount: player.matchCount,
        wins: 0,
        losses: 0,
        draws: 0,
        placementCount: player.placementCount,
        tier: tierForElo(player.elo),
        categoryPreferences: [],
        createdAt: new Date().toISOString(),
      };
    }

    return {
      id: data.id,
      username: data.username,
      email: data.email ?? undefined,
      elo: data.elo,
      matchCount: data.match_count,
      wins: data.wins ?? 0,
      losses: data.losses ?? 0,
      draws: data.draws ?? 0,
      placementCount: data.placement_count,
      tier: tierForElo(data.elo),
      categoryPreferences: data.category_preferences ?? [],
      createdAt: data.created_at,
    };
  }

  async getTossups(difficulties: number[], count: number, seenIds: Set<string>): Promise<Tossup[]> {
    try {
      const tossups = await this.qbreader.randomTossups(difficulties, count + 5, seenIds);
      if (tossups.length >= count) return tossups.slice(0, count);
    } catch {
      // Fallback below keeps local development playable when offline or rate-limited.
    }

    return Array.from({ length: count }, (_, index) => normalizeTossup(fallbackTossups[index % fallbackTossups.length]));
  }

  async judgeAnswer(given: string, answerLine: string) {
    return this.qbreader.checkAnswer(given, answerLine);
  }

  async finalizeMatch(match: ActiveMatch, ratingEvents: RatingEvent[]): Promise<void> {
    if (!this.supabase) return;

    const [player1, player2] = match.players;
    const winner = player1.score === player2.score ? null : player1.score > player2.score ? player1.id : player2.id;

    await this.supabase.from("matches").insert({
      id: match.id,
      player1_id: player1.id,
      player2_id: player2.id,
      player1_score: player1.score,
      player2_score: player2.score,
      winner_id: winner,
      is_draw: winner === null,
      difficulty: match.tossups[0]?.difficulty ?? 5,
      status: "completed",
      elo_delta: Object.fromEntries(ratingEvents.map((event) => [event.playerId, event.delta])),
      modifier_breakdown: ratingEvents,
      completed_at: new Date().toISOString(),
    });

    await this.supabase.from("tossup_results").insert(
      match.results.map((result) => ({
        id: result.id,
        match_id: result.matchId,
        tossup_id: result.tossupId,
        tossup_order: result.order,
        player_id: result.playerId,
        outcome: result.outcome,
        buzz_word_index: result.buzzWordIndex,
        points: result.points,
        was_power: result.wasPower,
        answer_given: result.answerGiven,
      })),
    );

    await this.supabase.from("rating_events").insert(
      ratingEvents.map((event) => ({
        match_id: match.id,
        player_id: event.playerId,
        rating_before: event.before,
        rating_after: event.after,
        delta: event.delta,
        expected_score: event.expectedScore,
        actual_score: event.actualScore,
        k_factor: event.kFactor,
        modifiers: event.modifiers,
      })),
    );

    for (const event of ratingEvents) {
      const { data: current } = await this.supabase
        .from("profiles")
        .select("match_count, placement_count, wins, losses, draws")
        .eq("id", event.playerId)
        .single();
      const playerWon = winner === event.playerId;
      const playerLost = winner !== null && winner !== event.playerId;

      await this.supabase
        .from("profiles")
        .update({
          elo: event.after,
          match_count: (current?.match_count ?? 0) + 1,
          wins: (current?.wins ?? 0) + (playerWon ? 1 : 0),
          losses: (current?.losses ?? 0) + (playerLost ? 1 : 0),
          draws: (current?.draws ?? 0) + (winner === null ? 1 : 0),
          placement_count: Math.min(5, (current?.placement_count ?? 0) + 1),
        })
        .eq("id", event.playerId);
    }
  }
}

export function buildRatingEvents(match: ActiveMatch): RatingEvent[] {
  const [player1, player2] = match.players;
  const player1Result = player1.score === player2.score ? 0.5 : player1.score > player2.score ? 1 : 0;
  const player2Result = player1Result === 0.5 ? 0.5 : player1Result === 1 ? 0 : 1;

  const p1 = calculateElo({
    playerElo: player1.elo,
    opponentElo: player2.elo,
    playerMatchCount: player1.matchCount,
    actualScore: player1Result,
    dominantWin: player1Result === 1 && player2.score === 0,
    upsetWin: player1Result === 1 && player2.elo - player1.elo >= 150,
    blowoutLoss: player1Result === 0 && player1.score === 0,
    powerStreak: player1.powers >= 3,
  });

  const p2 = calculateElo({
    playerElo: player2.elo,
    opponentElo: player1.elo,
    playerMatchCount: player2.matchCount,
    actualScore: player2Result,
    dominantWin: player2Result === 1 && player1.score === 0,
    upsetWin: player2Result === 1 && player1.elo - player2.elo >= 150,
    blowoutLoss: player2Result === 0 && player2.score === 0,
    powerStreak: player2.powers >= 3,
  });

  return [
    { playerId: player1.id, ...p1 },
    { playerId: player2.id, ...p2 },
  ];
}
