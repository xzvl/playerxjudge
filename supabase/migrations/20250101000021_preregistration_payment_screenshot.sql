-- Payment proof for guest pre-registration: when a guest checks "Advance
-- Payment" in the popup, they upload a screenshot of their payment alongside
-- the organizer's instructions/QR (see PreRegisterDialog.tsx). Both columns
-- are nullable — guests who don't check the box leave them unset.
alter table public.tournament_preregistrations
  add column advance_payment boolean not null default false,
  add column payment_screenshot_url text;

-- Guest-uploaded payment screenshots — a public bucket (matches the existing
-- tournament-thumbnails pattern) since the uploader has no account to scope
-- an RLS folder-ownership check to. Public read is acceptable here: paths
-- are per-tournament + random, not linked from anywhere public, and the
-- pre-registration rows themselves stay organizer/admin-read-only.
insert into storage.buckets (id, name, public)
values ('preregistration-payments', 'preregistration-payments', true)
on conflict (id) do nothing;

create policy "preregistration_payments_public_read" on storage.objects for select
  using (bucket_id = 'preregistration-payments');

create policy "preregistration_payments_public_insert" on storage.objects for insert
  with check (bucket_id = 'preregistration-payments');
