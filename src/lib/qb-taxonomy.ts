// QBReader category / subcategory taxonomy and difficulty tiers.
// Mirrors the granularity qbreader.org exposes on /random-tossup so practice
// filters can be as specific as the API allows (e.g. "American Literature").

export interface QbCategory {
  name: string;
  subcategories: string[];
}

export const qbTaxonomy: QbCategory[] = [
  {
    name: "Literature",
    subcategories: [
      "American Literature",
      "British Literature",
      "Classical Literature",
      "European Literature",
      "World Literature",
      "Other Literature",
    ],
  },
  {
    name: "History",
    subcategories: ["American History", "Ancient History", "European History", "World History", "Other History"],
  },
  {
    name: "Science",
    subcategories: ["Biology", "Chemistry", "Physics", "Other Science"],
  },
  {
    name: "Fine Arts",
    subcategories: ["Visual Fine Arts", "Auditory Fine Arts", "Other Fine Arts"],
  },
  { name: "Religion", subcategories: [] },
  { name: "Mythology", subcategories: [] },
  { name: "Philosophy", subcategories: [] },
  { name: "Social Science", subcategories: [] },
  { name: "Current Events", subcategories: [] },
  { name: "Geography", subcategories: [] },
  { name: "Other Academic", subcategories: [] },
  { name: "Trash", subcategories: [] },
];

export interface DifficultyTier {
  value: number;
  label: string;
}

// QBReader difficulty scale (1-10).
export const qbDifficultyTiers: DifficultyTier[] = [
  { value: 1, label: "Middle School" },
  { value: 2, label: "Easy HS" },
  { value: 3, label: "Regular HS" },
  { value: 4, label: "Hard HS" },
  { value: 5, label: "Nationals HS" },
  { value: 6, label: "Easy College" },
  { value: 7, label: "Regular College" },
  { value: 8, label: "Hard College" },
  { value: 9, label: "Nationals College" },
  { value: 10, label: "Open" },
];

export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;

export function difficultyLabel(value: number): string {
  return qbDifficultyTiers.find((tier) => tier.value === value)?.label ?? String(value);
}

export function expandDifficulties(min: number, max: number): number[] {
  const low = Math.max(MIN_DIFFICULTY, Math.min(min, max));
  const high = Math.min(MAX_DIFFICULTY, Math.max(min, max));
  const values: number[] = [];
  for (let value = low; value <= high; value += 1) values.push(value);
  return values;
}

export const allSubcategories = qbTaxonomy.flatMap((category) => category.subcategories);
