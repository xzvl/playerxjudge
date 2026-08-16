-- ============================================================
-- Links a real account (`profiles`) to a roster entry
-- (`tournament_participants`) — the missing connection that's kept player
-- match history/stats/achievements mock-only (tournament_participants is a
-- free-typed, walk-in-friendly roster with no FK back to profiles at all,
-- see 20250101000013_group_stage_matches.sql). This is the self-serve,
-- organizer-confirmed way that link gets made, one request at a time.
--
-- Two uniqueness rules:
--   - `unique (participant_id)` — a roster entry can only ever be claimed
--     by one account at a time (pending or approved). A wrong/duplicate
--     request has to be cancelled or declined before another can be made.
--   - `unique (profile_id, tournament_id)` — an account can only have one
--     active claim per tournament (you can't be two different roster
--     entries in the same event).
--
-- No 'declined' status: declining is the same as withdrawing — the row is
-- just deleted (see cancelParticipantLink / declineParticipantLink),
-- mirroring how withdrawCommunityJudgeRequest/removeCommunityMember work.
-- ============================================================

create table public.participant_links (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  unique (participant_id),
  unique (profile_id, tournament_id)
);

create index participant_links_tournament_id_idx on public.participant_links (tournament_id);
create index participant_links_profile_id_idx on public.participant_links (profile_id);

alter table public.participant_links enable row level security;

-- Publicly readable, same as tournament_participants itself — the player
-- view needs to know a participant's link status without an account.
create policy "participant_links_select_all" on public.participant_links for select using (true);

create policy "participant_links_insert_own" on public.participant_links for insert
  with check (profile_id = auth.uid());

-- Only an organizer (or admin) can move pending -> approved — see
-- confirmParticipantLink (app/account/organizer/participants/actions.ts).
create policy "participant_links_update_organizer_or_admin" on public.participant_links for update
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- The requester can cancel their own (pending or approved) link; the
-- organizer/admin can decline a pending one or unlink an approved one.
create policy "participant_links_delete_own_or_organizer_or_admin" on public.participant_links for delete
  using (profile_id = auth.uid() or public.is_organizer_of_tournament(tournament_id) or public.is_admin());
