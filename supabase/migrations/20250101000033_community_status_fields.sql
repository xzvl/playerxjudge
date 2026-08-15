-- ============================================================
-- Backs the Community Settings page's new "Started Date" / "Status" fields
-- (app/account/organizer/community/[slug]/settings) and the admin
-- approval workflow the "Apply Community" flow was always named for
-- (the Create Community form's submit button already says "Submit
-- Application" — this is what makes that literal: new communities now
-- start unapproved until an admin reviews them).
--
-- Two distinct, independent status concepts:
--   - `status` (active/inactive) — the organizer's own operational toggle,
--     editable from Settings.
--   - `approval_status` (pending/approved) — admin-only; the organizer
--     never writes this column (see updateCommunity, which never sends it).
-- ============================================================

alter table public.communities
  add column started_at date,
  add column status text not null default 'active' check (status in ('active', 'inactive')),
  add column approval_status text not null default 'approved' check (approval_status in ('pending', 'approved'));

-- Existing communities (created before this migration) are grandfathered in
-- as approved — same reasoning as the profile_communities status backfill
-- in 20250101000032: nobody already running a community should suddenly
-- vanish from public listings. New rows default to 'pending' from here on.
alter table public.communities alter column approval_status set default 'pending';

-- ============================================================
-- Minimal admin approval surface (app/account/admin) — lets an admin/
-- super_admin flip a pending community to approved (or reject it outright
-- via delete, same as the organizer's own Delete button). No separate
-- policy needed for that: "communities_update_owner_or_admin" and
-- "communities_delete_owner_or_admin" (20250101000006_functions_and_rls.sql)
-- already cover admins via is_admin(), on top of the owner case they were
-- written for.
-- ============================================================
