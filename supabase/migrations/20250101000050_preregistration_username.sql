-- Captures which real account (if any) was signed in when a guest submitted
-- the public Pre-register form (components/tournaments/PreRegisterDialog.tsx)
-- — set server-side from the caller's own session in submitPreRegistration
-- (app/tournaments/[slug]/actions.ts), never trusted from client input, so a
-- guest can never claim someone else's username here. Powers the organizer's
-- Copy All -> Bulk Add -> auto-link flow (see TournamentPreRegisterWorkspace
-- and bulkAddParticipants/addPreRegisteredParticipant) and the "Add to
-- roster" auto-link.
alter table public.tournament_preregistrations add column if not exists username text;

-- Lets an organizer (or admin) create an *already-approved* participant_links
-- row on a player's behalf — the existing "participant_links_insert_own"
-- policy (20250101000036_participant_links.sql) only allows profile_id =
-- auth.uid(), which is the self-serve "Link Me" request path. This is the
-- separate no-approval-needed path: promoting a pre-registration (that
-- captured the submitter's username) straight onto the roster links it in
-- the same write, skipping the pending state entirely. Both policies coexist
-- (OR'd together, same as every other multi-policy table here) — the
-- self-serve path is unaffected.
create policy "participant_links_insert_organizer_or_admin" on public.participant_links for insert
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());
