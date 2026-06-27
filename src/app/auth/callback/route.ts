import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const redirectTo = next?.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = supabase ? await supabase.auth.exchangeCodeForSession(code) : { error: new Error("Supabase is not configured.") };
    if (!error) return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?message=${encodeURIComponent("Could not finish sign in.")}`);
}
