-- ============================================================
-- Turns `profile_communities` into a real request-to-join workflow, backing
-- the new Members page (app/account/organizer/community/[slug]/members).
-- Previously a player picking a community in Account Settings became a
-- member instantly, with no organizer say in it at all.
--
-- Every *existing* row is backfilled to 'approved' (the column is added
-- with that as its default, which Postgres applies to already-existing rows
-- at add-time) — nobody already in a community gets silently bumped back to
-- pending. Only the default for *new* rows changes afterward, to 'pending'.
-- ============================================================

alter table public.profile_communities
  add column status text not null default 'approved' check (status in ('pending', 'approved'));

alter table public.profile_communities alter column status set default 'pending';

-- The existing "profile_communities_select_all" / "_insert_own" /
-- "_delete_own" policies (20250101000009_profile_settings.sql) are
-- unchanged — a player can still request to join (insert, now landing as
-- pending) and leave on their own (delete). This adds the organizer side:
-- accepting a request (update) and removing a request or an existing member
-- outright (delete).
create policy "profile_communities_update_organizer" on public.profile_communities for update
  using (public.is_organizer_of_community(community_id) or public.is_admin())
  with check (public.is_organizer_of_community(community_id) or public.is_admin());

create policy "profile_communities_delete_organizer" on public.profile_communities for delete
  using (public.is_organizer_of_community(community_id) or public.is_admin());
