-- Lets a signed-in submitter read back their own pre-registration
-- submissions — needed by the player dashboard's Registered Tournaments
-- page (app/account/player/registered-tournaments/page.tsx), which now
-- treats a captured pre-registration as one of the signals for "tournaments
-- I've joined", alongside participant_links. Previously only
-- "tournament_preregistrations_select_organizer"
-- (20250101000020_preregistration_payment.sql) existed, so this table was
-- unreadable by the guest who actually submitted it. Matches by `username`
-- (20250101000050_preregistration_username.sql) — the submitter's own
-- username, captured server-side and never client-trusted — rather than a
-- stored profile_id, since the column doesn't exist and a guest submission
-- may have no account at all (username null, so this policy simply never
-- matches those rows).
create policy "tournament_preregistrations_select_own" on public.tournament_preregistrations for select
  using (username is not null and username = (select username from public.profiles where id = auth.uid()));
