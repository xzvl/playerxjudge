-- ============================================================
-- Per-tournament active deck. A player's global active deck
-- (beyblade_decks.is_active) stays the default; a row here overrides it for
-- one tournament only. No row = the default applies automatically.
-- Deleting the deck removes the override, which falls back to the default.
-- ============================================================

create table public.tournament_deck_selections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  deck_id uuid not null references public.beyblade_decks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, tournament_id)
);

create index tournament_deck_selections_tournament_idx on public.tournament_deck_selections (tournament_id);

create trigger set_updated_at before update on public.tournament_deck_selections
  for each row execute function public.set_updated_at();

alter table public.tournament_deck_selections enable row level security;

create policy "tournament_deck_selections_all_own" on public.tournament_deck_selections for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
