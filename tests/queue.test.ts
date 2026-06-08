import { describe, expect, it } from "vitest";
import { MatchQueue } from "@/server/queue";
import type { QueuePlayer } from "@/server/types";

function player(id: string, elo: number, queuedAt = Date.now()): QueuePlayer {
  return {
    id,
    username: id,
    elo,
    matchCount: 0,
    placementCount: 5,
    socketId: `socket-${id}`,
    queuedAt,
  };
}

describe("MatchQueue", () => {
  it("matches players within 100 ELO immediately", () => {
    const queue = new MatchQueue();
    expect(queue.add(player("a", 1000))).toBeNull();
    expect(queue.add(player("b", 1090))?.id).toBe("a");
    expect(queue.size()).toBe(0);
  });

  it("does not match players outside the initial window", () => {
    const queue = new MatchQueue();
    expect(queue.add(player("a", 1000))).toBeNull();
    expect(queue.add(player("b", 1180))).toBeNull();
    expect(queue.size()).toBe(2);
  });

  it("expands to 200 ELO after 60 seconds", () => {
    const queue = new MatchQueue();
    expect(queue.add(player("a", 1000, Date.now() - 61_000))).toBeNull();
    expect(queue.add(player("b", 1180))?.id).toBe("a");
  });
});
