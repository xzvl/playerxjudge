import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

// A cookie-less, anonymous client for publicly readable data inside
// cross-request caches (unstable_cache can't read the request's cookies).
// Only ever sees what RLS allows the anon role, so it's safe to share.
let client: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicClient() {
  client ??= createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
