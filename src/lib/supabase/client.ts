"use client";

import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseBrowserConfig, supabaseAnonKey, supabaseUrl } from "../env";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseBrowserConfig()) return null;
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
