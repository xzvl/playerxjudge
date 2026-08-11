-- ============================================================
-- Tournament participants & groups — the roster/seeding/group-
-- assignment data behind the organizer's Manage Participants and
-- Manage Groups screens (app/account/organizer/tournament/[slug]/participants).
--
-- Deliberately separate from `registrations`: a registration requires
-- a real `profiles` row (someone who signed up through the site),
-- but organizers also need to add walk-in / manually-typed names
-- that have no account. `tournament_participants` is that free-typed
-- roster, independent of auth.
--
-- `group_id` puts a participant in at most one group at a time —
-- matches the UI (a participant belongs to a single group, moved
-- between groups rather than added to several). No `seed` uniqueness
-- constraint: seeds are reassigned in bulk on "Shuffle Seeds", and
-- enforcing uniqueness there would need a deferred constraint for no
-- real benefit — the UI always sorts by seed for display.
-- ============================================================

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tournament_id, label)
);

create index tournament_groups_tournament_id_idx on public.tournament_groups (tournament_id);

create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete set null,
  seed integer not null default 0,
  name text not null,
  team_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tournament_participants_tournament_id_idx on public.tournament_participants (tournament_id);
create index tournament_participants_group_id_idx on public.tournament_participants (group_id);

create trigger set_updated_at before update on public.tournament_participants
  for each row execute function public.set_updated_at();

alter table public.tournament_groups enable row level security;
alter table public.tournament_participants enable row level security;

-- Publicly readable (spectator-facing group/participant lists are the
-- eventual point of this table, same as brackets/matches), writes
-- restricted to the tournament's organizer or an admin.
create policy "tournament_groups_select_all" on public.tournament_groups for select using (true);
create policy "tournament_groups_write_organizer_or_admin" on public.tournament_groups for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

create policy "tournament_participants_select_all" on public.tournament_participants for select using (true);
create policy "tournament_participants_write_organizer_or_admin" on public.tournament_participants for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());
