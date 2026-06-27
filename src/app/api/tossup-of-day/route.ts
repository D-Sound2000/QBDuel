import { NextResponse } from "next/server";
import { getDailyTossup } from "@/lib/tossup-service";

export async function GET() {
  return NextResponse.json({ tossup: await getDailyTossup() });
}
