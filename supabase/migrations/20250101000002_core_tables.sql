-- Provinces (reference table for Philippine provinces)
create table public.provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text,
  created_at timestamptz not null default now()
);

-- Communities
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  description text,
  province_id uuid references public.provinces(id) on delete set null,
  is_premium boolean not null default false,
  member_count integer not null default 0,
  owner_id uuid, -- set after profiles exists via fk below
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index communities_province_id_idx on public.communities (province_id);
create index communities_slug_idx on public.communities (slug);

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  country text default 'Philippines',
  province_id uuid references public.provinces(id) on delete set null,
  city text,
  community_id uuid references public.communities(id) on delete set null,
  favorite_beyblade text,
  bio text,
  social_links jsonb not null default '{}'::jsonb,
  role public.user_role not null default 'player',
  subscription_plan public.subscription_plan not null default 'free',
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create index profiles_community_id_idx on public.profiles (community_id);
create index profiles_role_idx on public.profiles (role);

alter table public.communities
  add constraint communities_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete set null;

create index communities_owner_id_idx on public.communities (owner_id);

-- updated_at trigger helper, reused by every table with an updated_at column
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.communities
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
