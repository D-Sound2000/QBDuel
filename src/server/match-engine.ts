import { Server } from "socket.io";
import { difficultyForAverageElo } from "@/lib/domain/difficulty";
import type { TossupResult } from "@/lib/domain/types";
import { buildRatingEvents } from "./repository";
import type { ActiveMatch, MatchRepository, QueuePlayer } from "./types";

const tossupsPerMatch = 8;
const tickMs = 600;
const answerMs = 5_000;
const nextTossupMs = 1_500;

export class MatchEngine {
  private matches = new Map<string, ActiveMatch>();
  private playerToMatch = new Map<string, string>();

  constructor(
    private readonly io: Server,
    private readonly repository: MatchRepository,
  ) {}

  async createMatch(playerOne: QueuePlayer, playerTwo: QueuePlayer): Promise<ActiveMatch> {
    const difficulty = difficultyForAverageElo(playerOne.elo, playerTwo.elo);
    const tossups = await this.repository.getTossups(difficulty.difficulties, tossupsPerMatch, new Set());
    const match: ActiveMatch = {
      id: crypto.randomUUID(),
      players: [
        { ...playerOne, score: 0, powers: 0, negs: 0, connected: true },
        { ...playerTwo, score: 0, powers: 0, negs: 0, connected: true },
      ],
      tossups,
      tossupIndex: 0,
      wordIndex: 0,
      phase: "matched",
      currentBuzzPlayerId: null,
      answeredPlayerIds: new Set(),
      results: [],
      timers: [],
      createdAt: Date.now(),
    };

    this.matches.set(match.id, match);
    this.playerToMatch.set(playerOne.id, match.id);
    this.playerToMatch.set(playerTwo.id, match.id);

    for (const player of match.players) {
      this.io.sockets.sockets.get(player.socketId)?.join(match.id);
    }

    this.io.to(match.id).emit("match.found", {
      matchId: match.id,
      players: this.publicPlayers(match),
      difficulty: difficulty.label,
    });

    this.startCountdown(match);
    return match;
  }

  buzz(playerId: string, matchId?: string) {
    const match = this.resolveMatch(playerId, matchId);
    if (!match || match.phase !== "reading" || match.currentBuzzPlayerId) return;

    match.phase = "answering";
    match.currentBuzzPlayerId = playerId;
    this.clearTimers(match);

    this.io.to(match.id).emit("tossup.paused", { playerId, buzzWordIndex: match.wordIndex, serverTime: Date.now() });
    this.io.to(match.id).emit("answer.window", { playerId, deadline: Date.now() + answerMs });

    match.timers.push(
      setTimeout(() => {
        void this.handleAnswer(playerId, "", match.id);
      }, answerMs),
    );
  }

  async handleAnswer(playerId: string, answer: string, matchId?: string) {
    const match = this.resolveMatch(playerId, matchId);
    if (!match || match.phase !== "answering" || match.currentBuzzPlayerId !== playerId) return;

    this.clearTimers(match);
    const tossup = match.tossups[match.tossupIndex];
    const player = match.players.find((entry) => entry.id === playerId);
    if (!player || !tossup) return;

    const judgment = answer ? await this.repository.judgeAnswer(answer, tossup.answer) : "incorrect";

    if (judgment === "prompt") {
      this.io.to(match.id).emit("answer.window", { playerId, deadline: Date.now() + answerMs });
      match.timers.push(
        setTimeout(() => {
          void this.handleAnswer(playerId, answer, match.id);
        }, answerMs),
      );
      return;
    }

    if (judgment === "correct") {
      const wasPower = match.wordIndex < tossup.powerMarkIndex;
      const points = wasPower ? 15 : 10;
      player.score += points;
      if (wasPower) player.powers += 1;
      this.addResult(match, playerId, wasPower ? "power" : "correct", points, wasPower, answer);
      this.io.to(match.id).emit("answer.result", { message: `${player.username} ${wasPower ? "powered" : "got"} tossup ${match.tossupIndex + 1}.`, players: this.publicPlayers(match) });
      this.nextTossupOrEnd(match);
      return;
    }

    player.score -= 5;
    player.negs += 1;
    match.answeredPlayerIds.add(playerId);
    this.addResult(match, playerId, "neg", -5, false, answer);
    this.io.to(match.id).emit("answer.result", { message: `${player.username} negged.`, players: this.publicPlayers(match) });

    if (match.answeredPlayerIds.size >= match.players.length) {
      this.nextTossupOrEnd(match);
      return;
    }

    match.currentBuzzPlayerId = null;
    match.phase = "reading";
    this.resumeReading(match);
  }

  async forfeit(playerId: string) {
    const match = this.resolveMatch(playerId);
    if (!match || match.phase === "ended") return;
    const player = match.players.find((entry) => entry.id === playerId);
    if (player) player.connected = false;
    match.phase = "ended";
    this.clearTimers(match);
    this.io.to(match.id).emit("match.ended", { players: this.publicPlayers(match), message: "Match ended by disconnect." });
    await this.finalize(match);
  }

  getMatchForPlayer(playerId: string) {
    const matchId = this.playerToMatch.get(playerId);
    return matchId ? this.matches.get(matchId) ?? null : null;
  }

  private startCountdown(match: ActiveMatch) {
    match.phase = "countdown";
    [3, 2, 1].forEach((seconds, index) => {
      match.timers.push(setTimeout(() => this.io.to(match.id).emit("match.countdown", { seconds }), index * 1000));
    });
    match.timers.push(setTimeout(() => this.startReading(match), 3_000));
  }

  private startReading(match: ActiveMatch) {
    match.phase = "reading";
    match.wordIndex = 0;
    match.currentBuzzPlayerId = null;
    match.answeredPlayerIds = new Set();
    this.resumeReading(match);
  }

  private resumeReading(match: ActiveMatch) {
    const tossup = match.tossups[match.tossupIndex];
    if (!tossup) {
      void this.finalize(match);
      return;
    }

    const tick = () => {
      if (match.phase !== "reading") return;
      this.io.to(match.id).emit("tossup.tick", {
        tossupNumber: match.tossupIndex + 1,
        words: tossup.words,
        powerMarkIndex: tossup.powerMarkIndex,
        wordIndex: match.wordIndex,
      });

      if (match.wordIndex >= tossup.words.length - 1) {
        this.addResult(match, null, "miss", 0, false, "");
        this.nextTossupOrEnd(match);
        return;
      }

      match.wordIndex += 1;
      match.timers.push(setTimeout(tick, tickMs));
    };

    tick();
  }

  private nextTossupOrEnd(match: ActiveMatch) {
    this.clearTimers(match);
    this.io.to(match.id).emit("match.score", { players: this.publicPlayers(match) });
    match.tossupIndex += 1;
    match.wordIndex = 0;
    match.currentBuzzPlayerId = null;
    match.answeredPlayerIds = new Set();

    if (match.tossupIndex >= tossupsPerMatch) {
      void this.finalize(match);
      return;
    }

    match.timers.push(setTimeout(() => this.startReading(match), nextTossupMs));
  }

  private async finalize(match: ActiveMatch) {
    if (match.phase === "ended" && match.results.length >= tossupsPerMatch) return;
    match.phase = "ended";
    this.clearTimers(match);
    const ratingEvents = buildRatingEvents(match);
    await this.repository.finalizeMatch(match, ratingEvents);
    this.io.to(match.id).emit("match.ended", {
      players: this.publicPlayers(match),
      ratingEvents,
      message: match.players[0].score === match.players[1].score ? "Draw." : `${match.players[0].score > match.players[1].score ? match.players[0].username : match.players[1].username} wins.`,
    });

    for (const player of match.players) {
      this.playerToMatch.delete(player.id);
    }
    this.matches.delete(match.id);
  }

  private addResult(match: ActiveMatch, playerId: string | null, outcome: TossupResult["outcome"], points: number, wasPower: boolean, answerGiven: string) {
    const tossup = match.tossups[match.tossupIndex];
    if (!tossup) return;

    match.results.push({
      id: crypto.randomUUID(),
      matchId: match.id,
      tossupId: tossup.id,
      order: match.tossupIndex + 1,
      playerId,
      outcome,
      buzzWordIndex: playerId ? match.wordIndex : null,
      points,
      wasPower,
      answerGiven,
    });
  }

  private resolveMatch(playerId: string, matchId?: string) {
    const id = matchId ?? this.playerToMatch.get(playerId);
    if (!id) return null;
    const match = this.matches.get(id);
    if (!match || !match.players.some((player) => player.id === playerId)) return null;
    return match;
  }

  private publicPlayers(match: ActiveMatch) {
    return match.players.map((player) => ({
      id: player.id,
      username: player.username,
      elo: player.elo,
      score: player.score,
    }));
  }

  private clearTimers(match: ActiveMatch) {
    for (const timer of match.timers) clearTimeout(timer);
    match.timers = [];
  }
}
