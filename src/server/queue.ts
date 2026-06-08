import type { QueuePlayer } from "./types";

const initialEloWindow = 100;
const expandedEloWindow = 200;
const expansionMs = 60_000;

export class MatchQueue {
  private players = new Map<string, QueuePlayer>();

  add(player: QueuePlayer): QueuePlayer | null {
    this.players.set(player.id, player);
    const opponent = this.findOpponent(player);
    if (!opponent) return null;

    this.players.delete(player.id);
    this.players.delete(opponent.id);
    return opponent;
  }

  remove(playerId: string) {
    this.players.delete(playerId);
  }

  has(playerId: string) {
    return this.players.has(playerId);
  }

  size() {
    return this.players.size;
  }

  private findOpponent(player: QueuePlayer): QueuePlayer | null {
    const now = Date.now();

    for (const candidate of this.players.values()) {
      if (candidate.id === player.id) continue;
      const waitedLongEnough = now - candidate.queuedAt > expansionMs || now - player.queuedAt > expansionMs;
      const window = waitedLongEnough ? expandedEloWindow : initialEloWindow;
      if (Math.abs(candidate.elo - player.elo) <= window) return candidate;
    }

    return null;
  }
}
