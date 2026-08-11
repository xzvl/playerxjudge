-- ============================================================
-- Address restructure: the single "Full Address" field becomes
-- "Address Line (Street, Barangay)" + "City" + a real Province picker
-- (the `province_id` FK already existed on `tournaments` but the wizard
-- never actually used it until now).
-- ============================================================

alter table public.tournaments rename column address to address_line;
alter table public.tournaments add column city text;

-- ============================================================
-- Tournament thumbnails: a square image (cards/listings) and an optional
-- horizontal banner (tournament detail page). Stored as
-- `${tournament_id}/square.webp` / `${tournament_id}/horizontal.webp`,
-- publicly readable, writable only by that tournament's organizer or admin.
-- `thumbnail_url` already existed (square); `banner_url` is new.
-- ============================================================

alter table public.tournaments add column banner_url text;

insert into storage.buckets (id, name, public)
values ('tournament-thumbnails', 'tournament-thumbnails', true)
on conflict (id) do nothing;

create policy "tournament_thumbnails_public_read" on storage.objects for select
  using (bucket_id = 'tournament-thumbnails');

create policy "tournament_thumbnails_organizer_write" on storage.objects for insert
  with check (
    bucket_id = 'tournament-thumbnails'
    and (public.is_organizer_of_tournament(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "tournament_thumbnails_organizer_update" on storage.objects for update
  using (
    bucket_id = 'tournament-thumbnails'
    and (public.is_organizer_of_tournament(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "tournament_thumbnails_organizer_delete" on storage.objects for delete
  using (
    bucket_id = 'tournament-thumbnails'
    and (public.is_organizer_of_tournament(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
