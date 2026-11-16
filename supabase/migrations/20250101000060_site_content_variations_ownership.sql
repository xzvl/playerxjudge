-- ============================================================
-- 060: site content (CMS), maintenance mode, beyblade variations,
-- sponsor light-mode logo, and team ownership vs. captaincy split.
-- Run after 058/059.
-- ============================================================

-- ------------------------------------------------------------
-- Site settings: one JSON document per section (branding, header, hero,
-- footer, maintenance). Read by everyone (the public site renders from
-- it), written by staff from /backend/content and /backend/maintenance.
-- ------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

drop trigger if exists set_updated_at on public.site_settings;
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_select_all" on public.site_settings;
create policy "site_settings_select_all" on public.site_settings for select using (true);

drop policy if exists "site_settings_write_staff" on public.site_settings;
create policy "site_settings_write_staff" on public.site_settings for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- Uploaded branding/hero/footer images.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists "site_assets_public_read" on storage.objects;
create policy "site_assets_public_read" on storage.objects for select
  using (bucket_id = 'site-assets');

drop policy if exists "site_assets_staff_insert" on storage.objects;
create policy "site_assets_staff_insert" on storage.objects for insert
  with check (bucket_id = 'site-assets' and public.is_admin_or_manager());

drop policy if exists "site_assets_staff_update" on storage.objects;
create policy "site_assets_staff_update" on storage.objects for update
  using (bucket_id = 'site-assets' and public.is_admin_or_manager());

drop policy if exists "site_assets_staff_delete" on storage.objects;
create policy "site_assets_staff_delete" on storage.objects for delete
  using (bucket_id = 'site-assets' and public.is_admin_or_manager());

-- ------------------------------------------------------------
-- Beyblade variations: the same part released in different colorways /
-- editions. Images live in the existing `beyblade-images` bucket at
-- `${beyblade_id}/variations/${variation_id}.webp`.
-- ------------------------------------------------------------
create table if not exists public.beyblade_variations (
  id uuid primary key default gen_random_uuid(),
  beyblade_id uuid not null references public.beyblades(id) on delete cascade,
  name text not null,
  source text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beyblade_variations_beyblade_idx on public.beyblade_variations(beyblade_id, sort_order);

drop trigger if exists set_updated_at on public.beyblade_variations;
create trigger set_updated_at before update on public.beyblade_variations
  for each row execute function public.set_updated_at();

alter table public.beyblade_variations enable row level security;

drop policy if exists "beyblade_variations_select_all" on public.beyblade_variations;
create policy "beyblade_variations_select_all" on public.beyblade_variations for select using (true);

drop policy if exists "beyblade_variations_write_staff" on public.beyblade_variations;
create policy "beyblade_variations_write_staff" on public.beyblade_variations for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ------------------------------------------------------------
-- Sponsors: logo_url is now the dark-mode logo; logo_light_url is the
-- alternative shown on the light theme (falls back to logo_url).
-- Stored next to it as `${sponsorId}/logo-light.webp`, so the existing
-- sponsor-logos storage policies already cover it.
-- ------------------------------------------------------------
alter table public.sponsors add column if not exists logo_light_url text;

-- ------------------------------------------------------------
-- Teams: ownership (teams.owner_id) and captaincy (team_members.role =
-- 'captain') are now transferred separately.
--   * Owner: full control, including deleting the team and handing over
--     ownership. Only the owner can transfer ownership.
--   * Captain: the team leader. The owner or the current captain can hand
--     the captain role to another member.
-- ------------------------------------------------------------

-- The owner or the current captain may touch the captain role.
create or replace function public.guard_team_member_captain()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  team_owner uuid;
  touched_team uuid := coalesce(new.team_id, old.team_id);
  caller_is_captain boolean;
begin
  if auth.uid() is null or public.is_admin() then
    return coalesce(new, old);
  end if;

  if (tg_op in ('INSERT', 'UPDATE') and new.role = 'captain')
     or (tg_op in ('UPDATE', 'DELETE') and old.role = 'captain') then
    select owner_id into team_owner from public.teams where id = touched_team;
    -- No team row: it's being deleted and this is the cascade.
    if found and team_owner is distinct from auth.uid() then
      select exists (
        select 1 from public.team_members
        where team_id = touched_team and profile_id = auth.uid() and role = 'captain'
      ) into caller_is_captain;
      if not caller_is_captain then
        raise exception 'Only the team owner or captain can change the captain role';
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

-- Hands the captain role to another member. The old captain becomes a
-- sub-captain. Ownership does not move (see transfer_team_ownership).
create or replace function public.transfer_team_captaincy(target_team_id uuid, new_captain_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.teams where id = target_team_id and owner_id = auth.uid())
     and not exists (
       select 1 from public.team_members
       where team_id = target_team_id and profile_id = auth.uid() and role = 'captain'
     ) then
    raise exception 'Only the team owner or captain can transfer captaincy';
  end if;
  if not exists (
    select 1 from public.team_members where team_id = target_team_id and profile_id = new_captain_id
  ) then
    raise exception 'The new captain must already be on the team';
  end if;
  if exists (
    select 1 from public.team_members
    where team_id = target_team_id and profile_id = new_captain_id and role = 'captain'
  ) then
    return;
  end if;

  update public.team_members set role = 'sub_captain'
  where team_id = target_team_id and role = 'captain';

  update public.team_members set role = 'captain'
  where team_id = target_team_id and profile_id = new_captain_id;
end;
$$;

revoke all on function public.transfer_team_captaincy(uuid, uuid) from public;
grant execute on function public.transfer_team_captaincy(uuid, uuid) to authenticated;

-- Hands team ownership to another member. Roles are left as they are.
create or replace function public.transfer_team_ownership(target_team_id uuid, new_owner_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.teams where id = target_team_id and owner_id = auth.uid()) then
    raise exception 'Only the team owner can transfer ownership';
  end if;
  if not exists (
    select 1 from public.team_members where team_id = target_team_id and profile_id = new_owner_id
  ) then
    raise exception 'The new owner must already be on the team';
  end if;

  update public.teams set owner_id = new_owner_id where id = target_team_id;
end;
$$;

revoke all on function public.transfer_team_ownership(uuid, uuid) from public;
grant execute on function public.transfer_team_ownership(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Combos: which variation of each part the player uses, keyed by slot
-- (blade, ratchet, bit, lockChip, mainBlade, overBlade, metalBlade,
-- assistBlade) -> beyblade_variations.id. Missing key = the standard part.
-- The app checks each variation belongs to the part in its slot.
-- ------------------------------------------------------------
alter table public.beyblade_combos add column if not exists variations jsonb not null default '{}'::jsonb;
