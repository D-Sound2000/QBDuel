"use server";

import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function authError(message: string) {
  redirect(`/sign-in?message=${encodeURIComponent(message)}`);
}

export async function signInWithPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) authError("Supabase is not configured.");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) authError(error.message);
  redirect("/");
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) authError("Supabase is not configured.");

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appOrigin}/auth/callback?next=/onboarding` },
  });

  if (error) authError(error.message);
  if (data.session) redirect("/onboarding");
  redirect("/sign-in?message=Check your email to confirm your account.");
}

export async function signInWithGoogle() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) authError("Supabase is not configured.");

  const { data, error } = await supabase!.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appOrigin}/auth/callback?next=/onboarding` },
  });

  if (error || !data.url) authError(error?.message ?? "Could not start Google sign in.");
  redirect(data.url as never);
}

export async function resetPassword(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) authError("Supabase is not configured.");

  const email = String(formData.get("email") ?? "").trim();
  const { error } = await supabase!.auth.resetPasswordForEmail(email, {
    redirectTo: `${appOrigin}/auth/callback?next=/settings`,
  });

  if (error) authError(error.message);
  redirect("/sign-in?message=Password reset email sent.");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/sign-in");
}
