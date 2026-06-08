import type { Tier } from "./types";

export function tierForElo(elo: number): Tier {
  if (elo >= 1400) return "Master";
  if (elo >= 1300) return "Diamond";
  if (elo >= 1200) return "Platinum";
  if (elo >= 1100) return "Gold";
  if (elo >= 1000) return "Silver";
  return "Bronze";
}

export const tierColor: Record<Tier, string> = {
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#ffd700",
  Platinum: "#8faabf",
  Diamond: "#b9f2ff",
  Master: "#8b5cf6",
};
