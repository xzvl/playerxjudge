-- ============================================================
-- Extended profile settings: personal info, blader names,
-- multi-community membership (with a "main" community), and
-- profile photos.
-- ============================================================

alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column blader_names text[] not null default '{}'::text[],
  add column main_photo_url text,
  add column full_body_photo_url text,
  add column half_body_photo_url text;

-- Communities a profile belongs to (many-to-many). `profiles.community_id`
-- continues to point at the single "main" community, which must also be
-- one of the rows here (enforced by the app layer when saving).
create table public.profile_communities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, community_id)
);

create index profile_communities_profile_id_idx on public.profile_communities (profile_id);
create index profile_communities_community_id_idx on public.profile_communities (community_id);

alter table public.profile_communities enable row level security;

create policy "profile_communities_select_all" on public.profile_communities for select using (true);

create policy "profile_communities_insert_own" on public.profile_communities for insert
  with check (profile_id = auth.uid());

create policy "profile_communities_delete_own" on public.profile_communities for delete
  using (profile_id = auth.uid());

-- ============================================================
-- Storage: profile photos (main / full body / half body), stored
-- as `${profile_id}/${slot}.webp` and publicly readable.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile_photos_public_read" on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "profile_photos_owner_write" on storage.objects for insert
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile_photos_owner_update" on storage.objects for update
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile_photos_owner_delete" on storage.objects for delete
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
