export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseServiceRole(): boolean {
  return hasSupabaseConfig() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
export const qbReaderBaseUrl = process.env.QB_READER_BASE_URL ?? "https://www.qbreader.org/api";
