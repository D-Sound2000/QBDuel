export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasSupabaseServiceRole(): boolean {
  return hasSupabaseConfig() && Boolean(supabaseServiceRoleKey);
}

export function hasSupabaseBrowserConfig(): boolean {
  return hasSupabaseConfig();
}

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
export const qbReaderBaseUrl = process.env.QB_READER_BASE_URL ?? "https://www.qbreader.org/api";
export const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? process.env.APP_ORIGIN ?? "http://localhost:3000";
