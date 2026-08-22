-- Powers the Spectator Mode board's live station/judge display (see
-- SpectatorBoard.tsx, /account/organizer/tournament/[slug]/spectator) —
-- without this, a judge claiming/switching stations (judges.station_id) or
-- a station's match assignment changing (tournament_stations.current_match_id)
-- wouldn't reach that page's realtime subscriptions at all; only
-- `public.matches` was previously added to the publication (see
-- 20250101000049_matches_realtime.sql). No RLS changes needed — both tables
-- are already publicly selectable ("tournament_stations_select_all" /
-- the judges select policies), same as matches was.
alter publication supabase_realtime add table public.tournament_stations;
alter publication supabase_realtime add table public.judges;
