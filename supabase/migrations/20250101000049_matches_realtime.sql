-- ============================================================
-- Enables Supabase Realtime on public.matches — lets the organizer/backend
-- workspaces and the public player view subscribe to postgres_changes and
-- get pushed every insert/update the moment a match is started, reported,
-- edited, or cleared, instead of only seeing it after their next reload.
--
-- No RLS changes needed: "matches_select_all" (20250101000006_functions_and_rls.sql)
-- already lets anyone read this table, including the player view's
-- unauthenticated visitors, and Realtime's postgres_changes enforces that
-- same select policy per subscriber.
-- ============================================================

alter publication supabase_realtime add table public.matches;
