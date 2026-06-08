import { createClient } from "@supabase/supabase-js";
import { hasSupabaseServiceRole } from "../env";

export function createSupabaseAdminClient() {
  if (!hasSupabaseServiceRole()) return null;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
