import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

/**
 * Service-role Supabase client.
 * Bypasses RLS — use ONLY for admin tasks (audit-log writes from server,
 * scheduled jobs, migrations). Never expose to the browser bundle.
 */
export function createSupabaseAdminClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
