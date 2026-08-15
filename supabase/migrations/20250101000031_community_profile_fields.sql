-- ============================================================
-- Backs the new "Create Community" form
-- (app/account/organizer/community/new) — a headquarters location (same
-- Address Line / City / Province / lat-lng shape the tournament wizard
-- already uses, see 20250101000017_tournament_address_thumbnails.sql),
-- social links, and two extra logo variants alongside the existing
-- `logo_url`.
-- ============================================================

alter table public.communities
  add column headquarter_name text,
  add column address_line text,
  add column city text,
  add column province text,
  add column latitude double precision,
  add column longitude double precision,
  -- A second mark, used wherever a non-square/alternate treatment of the
  -- logo is needed (e.g. a dark-background placement) — organizers without
  -- separate art can just reuse the main logo (see the "Use community logo"
  -- checkbox in CommunityLogoSection).
  add column alt_logo_url text,
  -- The icon shown for this community's marker on maps — same reuse
  -- shortcut as alt_logo_url.
  add column pin_logo_url text,
  add column facebook_url text,
  add column instagram_url text,
  add column youtube_url text,
  add column messenger_url text;

-- ============================================================
-- Community logos: `${community_id}/logo.webp`, `/alt.webp`, `/pin.webp` in
-- a public bucket, writable only by that community's owner or an admin —
-- same shape as the tournament-thumbnails bucket
-- (20250101000017_tournament_address_thumbnails.sql), reusing the existing
-- is_organizer_of_community() helper (20250101000006_functions_and_rls.sql)
-- for the folder-scoped write check.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('community-logos', 'community-logos', true)
on conflict (id) do nothing;

create policy "community_logos_public_read" on storage.objects for select
  using (bucket_id = 'community-logos');

create policy "community_logos_owner_write" on storage.objects for insert
  with check (
    bucket_id = 'community-logos'
    and (public.is_organizer_of_community(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "community_logos_owner_update" on storage.objects for update
  using (
    bucket_id = 'community-logos'
    and (public.is_organizer_of_community(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "community_logos_owner_delete" on storage.objects for delete
  using (
    bucket_id = 'community-logos'
    and (public.is_organizer_of_community(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
