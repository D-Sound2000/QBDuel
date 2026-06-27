import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });

  return NextResponse.json({ accessToken: session.access_token });
}
