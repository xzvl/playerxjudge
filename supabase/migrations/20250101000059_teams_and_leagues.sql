-- ============================================================
-- Teams and team leagues: backs /account/team/* (management) and
-- /teams/[slug] (public profile).
--
--   teams                  a team (name, slug, logo, cover); owner = its captain
--   team_members           who's on it, with a role: captain / sub_captain /
--                          member / filler (exactly one captain per team)
--   team_invites           captain/sub-captain → player invitations
--   team_leagues           a league the team plays in (dates + how many
--                          "elite" main players it fields)
--   team_league_roster     per-league roster: elite (ordered) and subs (ordered)
--   team_league_matches    a roster player's match vs an outside opponent,
--                          scored from the player's side
--   team_league_battles    optional per-battle detail for a match
--
-- Everything is publicly readable (the public team/league pages need it).
-- Writes: captain & sub-captain manage the team; any member may log their
-- own league matches. Standings are computed in the app from the matches
-- (lib/teams/standings.ts), not stored.
-- ============================================================

create type public.team_role as enum ('captain', 'sub_captain', 'member', 'filler');
create type public.team_invite_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type public.league_roster_slot as enum ('elite', 'sub');
create type public.battle_outcome as enum ('win', 'loss');
create type public.battle_finish as enum ('spin', 'burst', 'over', 'extreme');

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tag text,
  description text,
  logo_url text,
  cover_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  constraint teams_name_length check (char_length(name) between 2 and 60),
  constraint teams_tag_length check (tag is null or char_length(tag) between 1 and 6)
);

create index teams_owner_id_idx on public.teams (owner_id);

create trigger set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

create index team_members_profile_id_idx on public.team_members (profile_id);
-- Exactly one captain at a time. Captaincy transfer demotes the current
-- captain before promoting the new one (see setMemberRole).
create unique index team_members_one_captain on public.team_members (team_id) where role = 'captain';

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  role public.team_role not null default 'member',
  status public.team_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint team_invites_role_not_captain check (role <> 'captain')
);

create index team_invites_invitee_idx on public.team_invites (invitee_id, status);
create unique index team_invites_one_pending on public.team_invites (team_id, invitee_id) where status = 'pending';

create table public.team_leagues (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  elite_count integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_leagues_name_length check (char_length(name) between 2 and 80),
  constraint team_leagues_dates check (end_date >= start_date),
  constraint team_leagues_elite_count check (elite_count between 1 and 50)
);

create index team_leagues_team_id_idx on public.team_leagues (team_id);

create trigger set_updated_at before update on public.team_leagues
  for each row execute function public.set_updated_at();

create table public.team_league_roster (
  league_id uuid not null references public.team_leagues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  slot public.league_roster_slot not null default 'sub',
  -- Order within the slot (0-based): elite order and the subs' bench order.
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (league_id, profile_id)
);

create table public.team_league_matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.team_leagues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  opponent_name text not null,
  opponent_team text,
  player_points integer not null,
  opponent_points integer not null,
  played_on date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_league_matches_points check (player_points between 0 and 99 and opponent_points between 0 and 99),
  constraint team_league_matches_opponent_length check (char_length(opponent_name) between 1 and 80)
);

create index team_league_matches_league_idx on public.team_league_matches (league_id, played_on desc);
create index team_league_matches_profile_idx on public.team_league_matches (profile_id);

create trigger set_updated_at before update on public.team_league_matches
  for each row execute function public.set_updated_at();

create table public.team_league_battles (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.team_league_matches(id) on delete cascade,
  battle_no integer not null,
  outcome public.battle_outcome not null,
  finish public.battle_finish not null,
  player_beyblade_id uuid references public.beyblades(id) on delete set null,
  opponent_beyblade_id uuid references public.beyblades(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint team_league_battles_no check (battle_no between 1 and 50),
  unique (match_id, battle_no)
);

-- ------------------------------------------------------------
-- Helpers (security definer so policies can consult team_members without
-- recursing through its own RLS)
-- ------------------------------------------------------------

create or replace function public.is_team_manager(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = target_team_id and t.owner_id = auth.uid()
  ) or exists (
    select 1 from public.team_members m
    where m.team_id = target_team_id
      and m.profile_id = auth.uid()
      and m.role in ('captain', 'sub_captain')
  );
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = target_team_id and m.profile_id = auth.uid()
  );
$$;

create or replace function public.team_of_league(target_league_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select team_id from public.team_leagues where id = target_league_id;
$$;

-- Managers can edit any match in their team's leagues; a player can edit
-- the matches they're the player on, or that they logged.
create or replace function public.can_edit_league_match(target_match_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_league_matches lm
    where lm.id = target_match_id
      and (
        lm.profile_id = auth.uid()
        or lm.created_by = auth.uid()
        or public.is_team_manager(public.team_of_league(lm.league_id))
      )
  );
$$;

-- Accepting an invite inserts the caller into team_members, which RLS
-- reserves for managers; this does it on the invitee's behalf after
-- checking the invite is theirs and still pending.
create or replace function public.accept_team_invite(target_invite_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  invite public.team_invites%rowtype;
begin
  select * into invite from public.team_invites
  where id = target_invite_id and invitee_id = auth.uid() and status = 'pending'
  for update;

  if not found then
    raise exception 'Invite not found or no longer pending';
  end if;

  insert into public.team_members (team_id, profile_id, role)
  values (invite.team_id, invite.invitee_id, invite.role)
  on conflict (team_id, profile_id) do nothing;

  update public.team_invites
  set status = 'accepted', responded_at = now()
  where id = invite.id;

  return invite.team_id;
end;
$$;

revoke all on function public.accept_team_invite(uuid) from public;
grant execute on function public.accept_team_invite(uuid) to authenticated;

-- Invitees never update team_invites directly (that would let them edit
-- the invite's role before accepting); declining goes through here.
create or replace function public.decline_team_invite(target_invite_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.team_invites
  set status = 'declined', responded_at = now()
  where id = target_invite_id and invitee_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Invite not found or no longer pending';
  end if;
end;
$$;

revoke all on function public.decline_team_invite(uuid) from public;
grant execute on function public.decline_team_invite(uuid) to authenticated;

-- ------------------------------------------------------------
-- Captaincy guards. Sub-captains are managers (they can edit members), so
-- without these a sub-captain could demote the captain and promote
-- themselves, or rewrite teams.owner_id. Only the current captain (the
-- team's owner) or an admin may touch the captain role or ownership;
-- auth.uid() is null for the service role / cascades from auth deletes.
-- ------------------------------------------------------------

create or replace function public.guard_team_member_captain()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  team_owner uuid;
  touched_team uuid := coalesce(new.team_id, old.team_id);
begin
  if auth.uid() is null or public.is_admin() then
    return coalesce(new, old);
  end if;

  if (tg_op in ('INSERT', 'UPDATE') and new.role = 'captain')
     or (tg_op in ('UPDATE', 'DELETE') and old.role = 'captain') then
    select owner_id into team_owner from public.teams where id = touched_team;
    -- No team row: it's being deleted and this is the cascade.
    if found and team_owner is distinct from auth.uid() then
      raise exception 'Only the team captain can change the captain role';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger guard_team_member_captain
  before insert or update or delete on public.team_members
  for each row execute function public.guard_team_member_captain();

create or replace function public.guard_team_owner()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     and auth.uid() is not null
     and auth.uid() is distinct from old.owner_id
     and not public.is_admin() then
    raise exception 'Only the team captain can transfer the team';
  end if;
  return new;
end;
$$;

create trigger guard_team_owner
  before update on public.teams
  for each row execute function public.guard_team_owner();

-- Hands captaincy to another member in one step: the old captain becomes
-- sub-captain, the new one becomes captain and the team's owner.
create or replace function public.transfer_team_captaincy(target_team_id uuid, new_captain_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.teams where id = target_team_id and owner_id = auth.uid()) then
    raise exception 'Only the team captain can transfer captaincy';
  end if;
  if not exists (
    select 1 from public.team_members where team_id = target_team_id and profile_id = new_captain_id
  ) then
    raise exception 'The new captain must already be on the team';
  end if;
  if new_captain_id = auth.uid() then
    return;
  end if;

  update public.team_members set role = 'sub_captain'
  where team_id = target_team_id and role = 'captain';

  update public.team_members set role = 'captain'
  where team_id = target_team_id and profile_id = new_captain_id;

  update public.teams set owner_id = new_captain_id where id = target_team_id;
end;
$$;

revoke all on function public.transfer_team_captaincy(uuid, uuid) from public;
grant execute on function public.transfer_team_captaincy(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_leagues enable row level security;
alter table public.team_league_roster enable row level security;
alter table public.team_league_matches enable row level security;
alter table public.team_league_battles enable row level security;

-- teams
create policy "teams_select_all" on public.teams for select using (true);
create policy "teams_insert_own" on public.teams for insert
  with check (owner_id = auth.uid());
create policy "teams_update_manager" on public.teams for update
  using (public.is_team_manager(id)) with check (public.is_team_manager(id));
create policy "teams_delete_owner" on public.teams for delete
  using (owner_id = auth.uid() or public.is_admin());

-- team_members
create policy "team_members_select_all" on public.team_members for select using (true);
create policy "team_members_insert_manager" on public.team_members for insert
  with check (public.is_team_manager(team_id));
create policy "team_members_update_manager" on public.team_members for update
  using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));
-- Managers remove members; anyone may leave (the app stops a captain from
-- leaving without handing over captaincy first).
create policy "team_members_delete_manager_or_self" on public.team_members for delete
  using (public.is_team_manager(team_id) or profile_id = auth.uid());

-- team_invites
create policy "team_invites_select_party" on public.team_invites for select
  using (invitee_id = auth.uid() or public.is_team_manager(team_id));
create policy "team_invites_insert_manager" on public.team_invites for insert
  with check (public.is_team_manager(team_id) and invited_by = auth.uid());
-- Managers only (cancelling); invitees respond via accept_/decline_team_invite.
create policy "team_invites_update_manager" on public.team_invites for update
  using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));

-- team_leagues
create policy "team_leagues_select_all" on public.team_leagues for select using (true);
create policy "team_leagues_write_manager" on public.team_leagues for all
  using (public.is_team_manager(team_id)) with check (public.is_team_manager(team_id));

-- team_league_roster
create policy "team_league_roster_select_all" on public.team_league_roster for select using (true);
create policy "team_league_roster_write_manager" on public.team_league_roster for all
  using (public.is_team_manager(public.team_of_league(league_id)))
  with check (public.is_team_manager(public.team_of_league(league_id)));
-- A player leaving the team takes themselves off its league rosters.
create policy "team_league_roster_delete_self" on public.team_league_roster for delete
  using (profile_id = auth.uid());

-- team_league_matches
create policy "team_league_matches_select_all" on public.team_league_matches for select using (true);
create policy "team_league_matches_insert" on public.team_league_matches for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.team_league_roster r
      where r.league_id = team_league_matches.league_id and r.profile_id = team_league_matches.profile_id
    )
    and (
      public.is_team_manager(public.team_of_league(league_id))
      or (profile_id = auth.uid() and public.is_team_member(public.team_of_league(league_id)))
    )
  );
create policy "team_league_matches_update" on public.team_league_matches for update
  using (public.can_edit_league_match(id)) with check (public.can_edit_league_match(id));
create policy "team_league_matches_delete" on public.team_league_matches for delete
  using (public.can_edit_league_match(id));

-- team_league_battles
create policy "team_league_battles_select_all" on public.team_league_battles for select using (true);
create policy "team_league_battles_write" on public.team_league_battles for all
  using (public.can_edit_league_match(match_id)) with check (public.can_edit_league_match(match_id));

-- A team manager may notify a player they have a pending invite out to.
create policy "notifications_insert_team_invite" on public.notifications for insert
  with check (
    exists (
      select 1 from public.team_invites i
      where i.invitee_id = profile_id
        and i.status = 'pending'
        and public.is_team_manager(i.team_id)
    )
  );

-- ------------------------------------------------------------
-- Storage: team logos and covers at `${teamId}/logo.webp` / `cover.webp`
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('team-images', 'team-images', true)
on conflict (id) do nothing;

create policy "team_images_public_read" on storage.objects for select
  using (bucket_id = 'team-images');

create policy "team_images_manager_insert" on storage.objects for insert
  with check (
    bucket_id = 'team-images'
    and public.is_team_manager(((storage.foldername(name))[1])::uuid)
  );

create policy "team_images_manager_update" on storage.objects for update
  using (
    bucket_id = 'team-images'
    and public.is_team_manager(((storage.foldername(name))[1])::uuid)
  );

create policy "team_images_manager_delete" on storage.objects for delete
  using (
    bucket_id = 'team-images'
    and public.is_team_manager(((storage.foldername(name))[1])::uuid)
  );
