-- ============================================================
-- Lets the organizer pick their own "stadium" (a tournament_stations row)
-- from the shared judge console (/tournaments/[slug]/judge), the same way
-- a confirmed judge already can via their own judges.station_id. The
-- organizer has no `judges` row of their own, so their pick lives here
-- instead. See setOwnStation in app/tournaments/[slug]/judge/actions.ts.
-- ============================================================

alter table public.tournaments
  add column organizer_station_id uuid references public.tournament_stations(id) on delete set null;
