-- ============================================================
-- Wizard/Settings additions: participant type + tournament tier
-- get two new options, tournaments get a real Location (name,
-- address, coordinates) and a Prize Pool.
-- ============================================================

-- `ALTER TYPE ... ADD VALUE` can't be used in the same transaction as a
-- statement that reads the new value, but this migration only adds it —
-- nothing here depends on 'team_battle'/'league' existing yet.
alter type public.battle_type add value 'team_battle';
alter type public.tournament_type add value 'league';

-- Prize pool config flags. Kept as real columns (not format_settings jsonb)
-- since, unlike bracket config, prize placements are meant to eventually be
-- publicly displayed/queried, same reasoning as `tournament_participants`.
alter table public.tournaments
  add column prize_snake_drafted boolean not null default false,
  add column prize_same_tier_prizes boolean not null default false;

-- Prizes — one row per placement. `placement` is a free-form label
-- ("Champion", "Top 8 Finalist", ...) rather than an enum: the valid set
-- depends on the tournament's own group/final stage settings (see
-- `buildPlacementOptions` in lib/validations/tournament-wizard.ts), so an
-- enum would need to be edited every time that logic changes.
create table public.tournament_prizes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  placement text not null,
  prize_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tournament_id, placement)
);

create index tournament_prizes_tournament_id_idx on public.tournament_prizes (tournament_id);

alter table public.tournament_prizes enable row level security;

create policy "tournament_prizes_select_all" on public.tournament_prizes for select using (true);
create policy "tournament_prizes_write_organizer_or_admin" on public.tournament_prizes for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());
