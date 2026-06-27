import { NextResponse } from "next/server";
import { getPracticeTossups } from "@/lib/tossup-service";

export async function GET() {
  return NextResponse.json({ tossups: await getPracticeTossups() });
}
