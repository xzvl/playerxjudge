-- ============================================================
-- Player-owned Beyblade combos (Blade + Ratchet + Bit) and decks — backs
-- /account/beyblade/*. Fully private: only the owning profile can see or
-- manage their own combos/decks, unlike the admin-managed `beyblades`
-- catalog itself (publicly readable).
--
-- v1 scope: a combo always picks one beyblade from each of the 'blade',
-- 'ratchet', and 'bit' categories specifically — the fused
-- ratchet_integrated_blade/ratchet_integrated_bit catalog pieces and the
-- individual Custom Line sub-parts (lock_chip/main_blade/over_blade/
-- metal_blade/assist_blade) aren't selectable here yet (see
-- getComboPickerOptions, app/account/beyblade/data.ts).
--
-- Combo stats (win/loss/matches) aren't tracked yet either — nothing in
-- `matches`/`tournament_participants` records which combo a game was
-- played with, so the dashboard shows 0s until that linkage exists as a
-- separate feature.
-- ============================================================

create table public.beyblade_combos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  -- `on delete cascade`: a combo can't exist without all three parts, so if
  -- an admin removes one from the catalog, combos built on it go with it
  -- rather than being left dangling or blocking the catalog cleanup.
  blade_id uuid not null references public.beyblades(id) on delete cascade,
  ratchet_id uuid not null references public.beyblades(id) on delete cascade,
  bit_id uuid not null references public.beyblades(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beyblade_combos_profile_id_idx on public.beyblade_combos (profile_id);

create trigger set_updated_at before update on public.beyblade_combos
  for each row execute function public.set_updated_at();

alter table public.beyblade_combos enable row level security;

create policy "beyblade_combos_all_own" on public.beyblade_combos for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- A deck always has exactly 3 combo slots (the Beyblade X standard) —
-- modeled as three nullable FK columns rather than a join table since the
-- slot count is a fixed game rule, not a variable one. Each profile has
-- exactly one deck for now, get-or-created lazily (see
-- getOrCreateActiveDeck, app/account/beyblade/data.ts); `name`/`is_active`
-- already exist so supporting multiple decks per profile later is
-- additive, not a rebuild.
create table public.beyblade_decks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'My Deck',
  is_active boolean not null default true,
  combo_1_id uuid references public.beyblade_combos(id) on delete set null,
  combo_2_id uuid references public.beyblade_combos(id) on delete set null,
  combo_3_id uuid references public.beyblade_combos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beyblade_decks_profile_id_idx on public.beyblade_decks (profile_id);

create trigger set_updated_at before update on public.beyblade_decks
  for each row execute function public.set_updated_at();

alter table public.beyblade_decks enable row level security;

create policy "beyblade_decks_all_own" on public.beyblade_decks for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
