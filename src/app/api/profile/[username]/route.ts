import { NextResponse } from "next/server";
import { getProfileStats } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const stats = await getProfileStats(username);
  if (!stats) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json(stats);
}
