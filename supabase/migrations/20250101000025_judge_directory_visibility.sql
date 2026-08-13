-- ============================================================
-- The Stations page's "Add Judge" search (see judges-actions.ts /
-- AddJudgeCombobox) reads public.profile_roles to list every approved
-- judge — but profile_roles_select_own_or_staff (20250101000008) only lets
-- you see your own rows or, if you're admin/manager, everyone's. An
-- organizer who is neither could see themselves and no one else, so the
-- search came back empty for every other judge.
--
-- Approved judges are meant to be discoverable for exactly this invite
-- flow, so this adds a second (permissive — OR'd with the existing one)
-- policy exposing just that slice: rows where role = 'judge' and
-- status = 'approved'. Pending/rejected applications and every other role
-- stay exactly as private as before.
-- ============================================================

create policy "profile_roles_select_approved_judges" on public.profile_roles for select
  using (role = 'judge' and status = 'approved');
