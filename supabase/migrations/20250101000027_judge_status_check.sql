-- ============================================================
-- is_judge_of_tournament (20250101000006_functions_and_rls.sql) never
-- checked judges.status — harmless while the table was empty/unused, but
-- now that invites actually flow through it (pending on invite, 'removed'
-- on decline — declining updates status rather than deleting the row, see
-- respondToJudgeInvite), a not-yet-confirmed or explicitly-declined judge
-- would still pass this check. It backs write access to matches,
-- tournament_stations, tournament_reports, tournament_log_entries, and
-- tournament_announcements, so this tightens all of those at once by
-- redefining the one function they all call.
-- ============================================================

create or replace function public.is_judge_of_tournament(target_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.judges j
    where j.tournament_id = target_tournament_id and j.judge_id = auth.uid() and j.status = 'approved'
  );
$$;
