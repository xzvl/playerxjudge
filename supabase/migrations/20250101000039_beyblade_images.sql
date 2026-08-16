-- ============================================================
-- Beyblade catalog images — one image per beyblade, stored as
-- `${beyblade_id}/image.webp` in its own public bucket (converted to WebP
-- client-side before upload, same as tournament thumbnails/community
-- logos/sponsor logos — see ThumbnailUploadField). Writable only by
-- /backend staff (admin or approved manager), same gate as the beyblades
-- table itself (20250101000038_beyblades.sql).
-- ============================================================

alter table public.beyblades add column image_url text;

insert into storage.buckets (id, name, public)
values ('beyblade-images', 'beyblade-images', true)
on conflict (id) do nothing;

create policy "beyblade_images_public_read" on storage.objects for select
  using (bucket_id = 'beyblade-images');

create policy "beyblade_images_staff_write" on storage.objects for insert
  with check (bucket_id = 'beyblade-images' and public.is_admin_or_manager());

create policy "beyblade_images_staff_update" on storage.objects for update
  using (bucket_id = 'beyblade-images' and public.is_admin_or_manager());

create policy "beyblade_images_staff_delete" on storage.objects for delete
  using (bucket_id = 'beyblade-images' and public.is_admin_or_manager());
