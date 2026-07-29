/**
 * True once real Supabase credentials are configured. Until then, auth-aware
 * code paths fail open to "logged out" instead of crashing — lets the app
 * boot and be reviewed before a Supabase project exists (see README).
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
