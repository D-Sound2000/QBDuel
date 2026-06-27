export const matchTossupCount = 7;
export const answerWindowMs = 10_000;
export const nextTossupDelayMs = 1_500;
export const defaultReadingWpm = 180;
export const readingWpmOptions = [150, 180, 200, 240] as const;

export function wordDelayMsForWpm(wpm: number) {
  return Math.round(60_000 / wpm);
}

export function normalizeReadingWpm(value: unknown) {
  const numeric = Number(value);
  return readingWpmOptions.includes(numeric as (typeof readingWpmOptions)[number]) ? numeric : defaultReadingWpm;
}
