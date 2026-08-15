-- ============================================================
-- Lets a confirmed judge update tournament_stations rows directly from the
-- judge console (/tournaments/[slug]/judge) — picking a match there now
-- assigns it to the judge's own claimed stadium and starts it, and
-- submitting a result clears that stadium back to idle (see
-- startMatchAtStation / handleBothConfirmed in JudgeConsole.tsx, both of
-- which call assignStationMatch in workspace-panels-actions.ts). Previously
-- only "tournament_stations_write_organizer_or_admin" covered writes here,
-- which silently failed (RLS denial) for a judge's own session. Scoped to
-- UPDATE only — adding/removing stations stays organizer/admin-only.
-- ============================================================

create policy "tournament_stations_update_judge" on public.tournament_stations for update
  using (public.is_judge_of_tournament(tournament_id))
  with check (public.is_judge_of_tournament(tournament_id));

-- The public player view now shows which stadium a participant is
-- currently playing at (see currentStationName in
-- app/tournaments/[slug]/player/page.tsx) — station names aren't sensitive,
-- same "select using (true)" openness tournament_groups/
-- tournament_participants/matches already have for this same page. Adds to,
-- rather than replaces, "tournament_stations_select_staff" above.
create policy "tournament_stations_select_all" on public.tournament_stations for select using (true);
