import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

/**
 * Privileged client using the service role key. Bypasses RLS.
 * Import only inside Server Actions / Route Handlers that require elevated
 * access (e.g. admin operations) — the `server-only` import guarantees a
 * build failure if this is ever pulled into client code.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
