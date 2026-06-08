export interface EloInput {
  playerElo: number;
  opponentElo: number;
  playerMatchCount: number;
  actualScore: 0 | 0.5 | 1;
  dominantWin?: boolean;
  upsetWin?: boolean;
  blowoutLoss?: boolean;
  powerStreak?: boolean;
}

export interface EloResult {
  before: number;
  after: number;
  delta: number;
  expectedScore: number;
  actualScore: 0 | 0.5 | 1;
  kFactor: number;
  modifiers: string[];
}

export function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + 10 ** ((opponentElo - playerElo) / 400));
}

export function kFactor(matchCount: number): number {
  if (matchCount < 30) return 40;
  if (matchCount <= 150) return 24;
  return 16;
}

export function calculateElo(input: EloInput): EloResult {
  const expected = expectedScore(input.playerElo, input.opponentElo);
  const k = kFactor(input.playerMatchCount);
  const base = k * (input.actualScore - expected);
  const modifiers: string[] = [];
  let adjusted = base;

  if (input.dominantWin && adjusted > 0) {
    adjusted *= 1.1;
    modifiers.push("dominant-win");
  }

  if (input.upsetWin && adjusted > 0) {
    adjusted *= 1.15;
    modifiers.push("upset-win");
  }

  if (input.blowoutLoss && adjusted < 0) {
    adjusted *= 1.1;
    modifiers.push("blowout-loss");
  }

  if (input.powerStreak && adjusted > 0) {
    adjusted += 5;
    modifiers.push("power-streak");
  }

  const delta = Math.round(adjusted);

  return {
    before: input.playerElo,
    after: Math.max(0, input.playerElo + delta),
    delta,
    expectedScore: Number(expected.toFixed(4)),
    actualScore: input.actualScore,
    kFactor: k,
    modifiers,
  };
}
