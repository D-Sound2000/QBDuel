export interface DifficultyBracket {
  minElo: number;
  maxElo: number;
  difficulties: number[];
  label: string;
}

export const difficultyBrackets: DifficultyBracket[] = [
  { minElo: 0, maxElo: 999, difficulties: [3, 4], label: "Easy HS" },
  { minElo: 1000, maxElo: 1099, difficulties: [4, 5], label: "Mid HS" },
  { minElo: 1100, maxElo: 1199, difficulties: [5, 6], label: "Hard HS" },
  { minElo: 1200, maxElo: 1299, difficulties: [6, 7], label: "Nats HS / Easy College" },
  { minElo: 1300, maxElo: 1399, difficulties: [7, 8], label: "Medium College" },
  { minElo: 1400, maxElo: Number.POSITIVE_INFINITY, difficulties: [8, 9], label: "Hard College" },
];

export function difficultyForAverageElo(playerOneElo: number, playerTwoElo: number): DifficultyBracket {
  const average = Math.round((playerOneElo + playerTwoElo) / 2);
  return difficultyBrackets.find((bracket) => average >= bracket.minElo && average <= bracket.maxElo) ?? difficultyBrackets[1];
}
