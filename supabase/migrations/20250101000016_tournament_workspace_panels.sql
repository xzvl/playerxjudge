-- ============================================================
-- Backs the last four organizer workspace pages that were still mock-only:
-- Announcements, Stations, Reports, and the activity Log.
-- ============================================================

create table public.tournament_announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  posted_by uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index tournament_announcements_tournament_id_idx on public.tournament_announcements (tournament_id, created_at desc);

alter table public.tournament_announcements enable row level security;

create policy "tournament_announcements_select_staff" on public.tournament_announcements for select
  using (
    public.is_organizer_of_tournament(tournament_id)
    or public.is_judge_of_tournament(tournament_id)
    or public.is_admin()
  );
create policy "tournament_announcements_write_organizer_or_admin" on public.tournament_announcements for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- Physical play areas, and (optionally) which match is currently assigned
-- to each. `current_match_id` is cleared automatically if that match is
-- ever deleted (tournament reset).
create table public.tournament_stations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  status text not null default 'idle' check (status in ('idle', 'in_progress', 'complete')),
  current_match_id uuid references public.matches(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index tournament_stations_tournament_id_idx on public.tournament_stations (tournament_id, sort_order);

alter table public.tournament_stations enable row level security;

create policy "tournament_stations_select_staff" on public.tournament_stations for select
  using (
    public.is_organizer_of_tournament(tournament_id)
    or public.is_judge_of_tournament(tournament_id)
    or public.is_admin()
  );
create policy "tournament_stations_write_organizer_or_admin" on public.tournament_stations for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- Player-filed issues. `reporter_id` is nullable so a filer's account being
-- deleted later doesn't take the report record with it. No player-facing
-- filing flow exists yet — this table backs the organizer-side
-- view/resolve/dismiss/reopen half of the feature only.
create table public.tournament_reports (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_label text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index tournament_reports_tournament_id_idx on public.tournament_reports (tournament_id, created_at desc);

alter table public.tournament_reports enable row level security;

create policy "tournament_reports_select_staff" on public.tournament_reports for select
  using (
    public.is_organizer_of_tournament(tournament_id)
    or public.is_judge_of_tournament(tournament_id)
    or public.is_admin()
  );
create policy "tournament_reports_write_organizer_or_admin" on public.tournament_reports for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- Append-only activity feed. `actor` is a plain text snapshot (not a
-- profiles FK) since some entries aren't attributable to one signed-in
-- person (e.g. "Group Stage" as the actor for an auto-generated round).
create table public.tournament_log_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  actor text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index tournament_log_entries_tournament_id_idx on public.tournament_log_entries (tournament_id, created_at desc);

alter table public.tournament_log_entries enable row level security;

create policy "tournament_log_entries_select_staff" on public.tournament_log_entries for select
  using (
    public.is_organizer_of_tournament(tournament_id)
    or public.is_judge_of_tournament(tournament_id)
    or public.is_admin()
  );
-- Written by server actions using the signed-in user's own session (never
-- client-editable), same organizer/admin boundary as everything else here.
create policy "tournament_log_entries_insert_organizer_or_admin" on public.tournament_log_entries for insert
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());
