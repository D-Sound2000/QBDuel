import { NextResponse } from "next/server";
import { getMatch } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await getMatch(id));
}
