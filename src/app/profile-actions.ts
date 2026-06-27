"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be at most 24 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only."),
  categoryPreferences: z.array(z.string().min(1)).max(12),
});

async function currentUserOrRedirect() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/sign-in?message=Supabase is not configured.");

  const {
    data: { user },
  } = await supabase!.auth.getUser();

  if (!user) redirect("/sign-in");
  return { supabase: supabase!, user };
}

export async function saveProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    categoryPreferences: formData.getAll("categories").map(String),
  });

  if (!parsed.success) {
    redirect(`/onboarding?message=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid profile.")}`);
  }

  const { supabase, user } = await currentUserOrRedirect();
  const { data: existingProfile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  const { error } = existingProfile
    ? await supabase
        .from("profiles")
        .update({
          username: parsed.data.username,
          category_preferences: parsed.data.categoryPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
    : await supabase.from("profiles").insert({
        id: user.id,
        username: parsed.data.username,
        email: user.email,
        category_preferences: parsed.data.categoryPreferences,
      });

  if (error) {
    redirect(`/onboarding?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function updateSettings(formData: FormData) {
  const parsed = profileSchema.safeParse({
    username: formData.get("username"),
    categoryPreferences: formData.getAll("categories").map(String),
  });

  if (!parsed.success) {
    redirect(`/settings?message=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid profile.")}`);
  }

  const { supabase, user } = await currentUserOrRedirect();
  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      category_preferences: parsed.data.categoryPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) redirect(`/settings?message=${encodeURIComponent(error.message)}`);
  redirect("/settings?message=Settings saved.");
}
