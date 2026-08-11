-- ============================================================
-- Multi-role model with an admin/manager approval workflow.
--
-- Replaces the single `profiles.role` enum column with a
-- `profile_roles` join table so a profile can hold several roles
-- at once, each independently pending/approved/rejected. Adds a
-- `manager` role (platform staff below admin) and per-community
-- judge assignment (`community_judges`), since judging previously
-- only existed per-tournament.
-- ============================================================

create type public.app_role as enum ('player', 'judge', 'sponsor', 'organizer', 'manager', 'admin');
create type public.role_status as enum ('pending', 'approved', 'rejected');
create type public.judge_assignment_status as enum ('pending', 'approved', 'removed');

create table public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  status public.role_status not null default 'approved',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  notes text,
  unique (profile_id, role)
);

create index profile_roles_profile_id_idx on public.profile_roles (profile_id);
create index profile_roles_role_status_idx on public.profile_roles (role, status);

create table public.community_judges (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  judge_id uuid not null references public.profiles(id) on delete cascade,
  status public.judge_assignment_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  unique (community_id, judge_id)
);

create index community_judges_community_id_idx on public.community_judges (community_id);
create index community_judges_judge_id_idx on public.community_judges (judge_id);

-- ============================================================
-- Backfill: give every existing profile an approved 'player' row,
-- plus an approved row for whatever elevated role they already had
-- (super_admin folds into admin — that value is being removed).
-- Must run before the old `role` column is dropped below.
-- ============================================================

insert into public.profile_roles (profile_id, role, status)
select id, 'player', 'approved' from public.profiles
on conflict (profile_id, role) do nothing;

insert into public.profile_roles (profile_id, role, status)
select id,
  case role
    when 'super_admin' then 'admin'::public.app_role
    else role::text::public.app_role
  end,
  'approved'
from public.profiles
where role::text in ('judge', 'sponsor', 'organizer', 'admin', 'super_admin')
on conflict (profile_id, role) do nothing;

-- ============================================================
-- Helper functions (security definer, same pattern as existing
-- helpers in 20250101000006_functions_and_rls.sql)
-- ============================================================

create or replace function public.has_approved_role(target_role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role = target_role and status = 'approved'
  );
$$;

-- Redefine in place: same name/signature, so the ~20 existing RLS
-- policies that already call is_admin() keep working unchanged.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profile_roles
    where profile_id = auth.uid() and role in ('admin', 'manager') and status = 'approved'
  );
$$;

-- Every new signup starts out an approved player.
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

  insert into public.profile_roles (profile_id, role, status)
  values (new.id, 'player', 'approved')
  on conflict (profile_id, role) do nothing;

  return new;
end;
$$;

-- Free-tier organizer cap: 2 -> 5 tournaments.
create or replace function public.enforce_tournament_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  organizer_plan public.subscription_plan;
  existing_count integer;
begin
  select subscription_plan into organizer_plan
  from public.profiles where id = new.organizer_id;

  if organizer_plan = 'premium' then
    return new;
  end if;

  select count(*) into existing_count
  from public.tournaments
  where organizer_id = new.organizer_id;

  if existing_count >= 5 then
    raise exception 'Free plan is limited to 5 tournaments. Upgrade to Premium for unlimited tournaments.';
  end if;

  return new;
end;
$$;

-- ============================================================
-- Drop the old single-role column/type now that profile_roles
-- has been backfilled from it.
-- ============================================================

-- Superseded by profile_roles (a profile can now hold several roles at
-- once, so a single "current role" no longer means anything); unused
-- anywhere in app code or other policies.
drop function if exists public.current_user_role();

drop index if exists public.profiles_role_idx;
alter table public.profiles drop column role;
drop type public.user_role;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profile_roles enable row level security;
alter table public.community_judges enable row level security;

create policy "profile_roles_select_own_or_staff" on public.profile_roles for select
  using (profile_id = auth.uid() or public.is_admin_or_manager());

-- Self-service application: judge/sponsor/organizer only, always starts pending.
create policy "profile_roles_insert_self_apply" on public.profile_roles for insert
  with check (profile_id = auth.uid() and role in ('judge', 'sponsor', 'organizer') and status = 'pending');

-- Admin can grant/insert any role directly (including admin/manager).
create policy "profile_roles_insert_admin_grant" on public.profile_roles for insert
  with check (public.is_admin());

-- Deciding judge/sponsor/organizer requests: admin or manager.
-- Deciding admin/manager rows: admin only.
create policy "profile_roles_update_staff" on public.profile_roles for update
  using (
    (role in ('judge', 'sponsor', 'organizer') and public.is_admin_or_manager())
    or (role in ('admin', 'manager') and public.is_admin())
  )
  with check (
    (role in ('judge', 'sponsor', 'organizer') and public.is_admin_or_manager())
    or (role in ('admin', 'manager') and public.is_admin())
  );

create policy "profile_roles_delete_admin" on public.profile_roles for delete
  using (public.is_admin());

create policy "community_judges_select_scoped" on public.community_judges for select
  using (
    judge_id = auth.uid()
    or public.is_organizer_of_community(community_id)
    or public.is_admin_or_manager()
  );

create policy "community_judges_insert_self" on public.community_judges for insert
  with check (judge_id = auth.uid() and status = 'pending' and public.has_approved_role('judge'));

create policy "community_judges_update_organizer_or_admin" on public.community_judges for update
  using (public.is_organizer_of_community(community_id) or public.is_admin_or_manager())
  with check (public.is_organizer_of_community(community_id) or public.is_admin_or_manager());

create policy "community_judges_delete_self_or_organizer" on public.community_judges for delete
  using (
    judge_id = auth.uid()
    or public.is_organizer_of_community(community_id)
    or public.is_admin_or_manager()
  );

-- Managers decide role requests too (see profile_roles_update_staff above),
-- so they also need to be able to notify the applicant of the outcome —
-- the existing "notifications_insert_admin" policy only covers admins.
create policy "notifications_insert_staff" on public.notifications for insert
  with check (public.is_admin_or_manager());
