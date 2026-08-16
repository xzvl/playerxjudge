-- ============================================================
-- Backs app/account/judge/profile — a judge uploads their "BeyZ ID" (a
-- graphic they generate at https://bey-z-generation.web.app/) as proof of
-- identity. Once an admin confirms it (DB-only for now, same manual
-- Supabase Studio flow as sponsor listing approval — see
-- 20250101000034_sponsor_listings.sql — no admin UI yet), the judge is a
-- "Certified Judge"; otherwise they're just a regular judge.
--
-- Lives on `profiles` (not the `judges`/`community_judges` per-assignment
-- tables) since it's a one-time, account-level credential, not something
-- that varies per tournament — mirrors how `subscription_plan` lives on
-- profiles rather than per-community.
--
-- No new storage bucket: the image reuses the existing `profile-photos`
-- bucket (20250101000009_profile_settings.sql) at `${profile_id}/beyz-id.webp`
-- — its owner-write/update/delete policies already key off the path's
-- leading `auth.uid()` folder, so nothing further to grant.
-- ============================================================

alter table public.profiles
  add column beyz_id_url text,
  add column beyz_id_status text check (beyz_id_status in ('pending', 'approved', 'declined'));
