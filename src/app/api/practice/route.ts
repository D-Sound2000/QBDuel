import { NextResponse } from "next/server";
import { z } from "zod";
import { getPracticeTossups } from "@/lib/tossup-service";

const querySchema = z.object({
  difficulties: z.array(z.number().int().min(1).max(10)).optional(),
  categories: z.array(z.string().min(1)).optional(),
  subcategories: z.array(z.string().min(1)).optional(),
  count: z.number().int().min(1).max(30).optional(),
});

function csv(value: string | null): string[] {
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const difficulties = csv(params.get("difficulties"))
    .map(Number)
    .filter((value) => Number.isFinite(value));
  const rawCount = params.get("count");

  const parsed = querySchema.safeParse({
    difficulties: difficulties.length ? difficulties : undefined,
    categories: csv(params.get("categories")),
    subcategories: csv(params.get("subcategories")),
    count: rawCount ? Number(rawCount) : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid practice query." }, { status: 400 });
  }

  const tossups = await getPracticeTossups({
    count: parsed.data.count ?? 12,
    difficulties: parsed.data.difficulties,
    categories: parsed.data.categories,
    subcategories: parsed.data.subcategories,
  });

  return NextResponse.json({ tossups });
}
