import { NextResponse } from "next/server";
import { getProfileStats } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return NextResponse.json(await getProfileStats(username));
}
