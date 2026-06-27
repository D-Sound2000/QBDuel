import { createClient } from "@supabase/supabase-js";
import { hasSupabaseServiceRole, supabaseServiceRoleKey, supabaseUrl } from "../env";

export function createSupabaseAdminClient() {
  if (!hasSupabaseServiceRole()) return null;

  return createClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
