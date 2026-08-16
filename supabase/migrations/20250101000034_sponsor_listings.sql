-- ============================================================
-- Sponsors go from "one profile per account" (20250101000004) to "one or
-- more listings per account" — mirrors how an organizer can own several
-- communities. `/become/sponsor` is now just the role gate (company name,
-- website, phone); each actual sponsor listing (name, website, Facebook,
-- logo, donation tier) is created separately from
-- app/account/sponsor/new and managed from the dashboard's listing grid
-- (app/account/sponsor/dashboard), same shape as
-- app/account/organizer/community.
--
-- Two independent status concepts, same split as communities
-- (20250101000033_community_status_fields.sql):
--   - `approval_status` (pending/approved/declined) — admin-only, flipped
--     manually via Supabase Studio for now (no admin UI yet).
--   - "active"/"inactive" is NOT a stored column here — unlike a
--     community's operational toggle, a sponsor listing's visible status is
--     entirely a function of `approval_status` + `tier_expires_at` (see
--     lib/sponsors/status.ts's `sponsorListingStatus`), so there's nothing
--     to keep in sync as a tier's expiry date rolls past "today".
-- ============================================================

alter table public.sponsors drop constraint sponsors_profile_id_key;

alter table public.sponsors
  add column phone text,
  add column facebook_url text,
  add column donation_tier text check (donation_tier in ('1_month', '6_months', '1_year')),
  add column tier_requested_at timestamptz,
  add column tier_expires_at date,
  add column approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'declined'));

-- Existing sponsor rows (created before this migration, back when a row
-- existed only after admin-verified signup) are grandfathered in as
-- approved — same reasoning as communities_status_fields' backfill.
update public.sponsors set approval_status = 'approved';

-- ============================================================
-- Owner-facing Delete (the listing grid's Delete button) — previously
-- admin-only ("sponsors_delete_admin", 20250101000006_functions_and_rls.sql).
-- Mirrors "communities_delete_owner_or_admin".
-- ============================================================
drop policy "sponsors_delete_admin" on public.sponsors;
create policy "sponsors_delete_own_or_admin" on public.sponsors for delete
  using (profile_id = auth.uid() or public.is_admin());

-- ============================================================
-- Sponsor logos — same shape as `community-logos`
-- (20250101000031_community_profile_fields.sql), stored at
-- `${sponsorId}/logo.webp`, ownership via the existing is_sponsor_owner().
-- ============================================================
insert into storage.buckets (id, name, public)
values ('sponsor-logos', 'sponsor-logos', true)
on conflict (id) do nothing;

create policy "sponsor_logos_public_read" on storage.objects for select
  using (bucket_id = 'sponsor-logos');

create policy "sponsor_logos_owner_write" on storage.objects for insert
  with check (
    bucket_id = 'sponsor-logos'
    and (public.is_sponsor_owner(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "sponsor_logos_owner_update" on storage.objects for update
  using (
    bucket_id = 'sponsor-logos'
    and (public.is_sponsor_owner(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "sponsor_logos_owner_delete" on storage.objects for delete
  using (
    bucket_id = 'sponsor-logos'
    and (public.is_sponsor_owner(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
