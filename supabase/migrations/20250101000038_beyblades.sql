-- ============================================================
-- Backs /backend/beyblades — the admin-managed Beyblade parts catalog
-- (Attack/Balance/Defense/Stamina blades, ratchets, bits, and — for the
-- Custom Line system — the individual Lock Chip/Main Blade/Over Blade/
-- Metal Blade/Assist Blade pieces a "Blade" category row can be assembled
-- from). Publicly readable (this is reference data, same reasoning as
-- brackets/matches), writes restricted to /backend staff (admin or
-- approved manager — mirrors isStaffProfile, the app-layer gate
-- app/backend/layout.tsx already enforces for the whole /backend tree).
-- ============================================================

create table public.beyblades (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_name text not null,
  type text not null check (type in ('attack', 'balance', 'defense', 'stamina')),
  series text not null default 'x_generation'
    check (series in ('plastic_generation', 'metal_generation', 'burst_generation', 'x_generation')),
  system_line text not null check (system_line in ('basic_line', 'unique_line', 'custom_line')),
  category text not null check (category in (
    'lock_chip', 'main_blade', 'over_blade', 'metal_blade', 'assist_blade', 'blade',
    'ratchet_integrated_blade', 'ratchet', 'bit', 'ratchet_integrated_bit'
  )),
  spin_direction text not null check (spin_direction in ('right', 'left', 'dual')),
  attack numeric,
  defense numeric,
  stamina numeric,
  height numeric,
  dash numeric,
  burst_resistance numeric,
  description text,

  -- Only meaningful when system_line = 'custom_line' and category = 'blade'
  -- — the pickers that assemble a composite Blade out of other rows in
  -- this same table (see BeybladeForm's conditional fields). expand_blade
  -- toggles which middle piece the assembly uses: false -> main_blade_id,
  -- true -> over_blade_id + metal_blade_id (lock_chip_id/assist_blade_id
  -- apply either way).
  lock_chip_id uuid references public.beyblades(id) on delete set null,
  main_blade_id uuid references public.beyblades(id) on delete set null,
  over_blade_id uuid references public.beyblades(id) on delete set null,
  metal_blade_id uuid references public.beyblades(id) on delete set null,
  assist_blade_id uuid references public.beyblades(id) on delete set null,
  expand_blade boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index beyblades_category_idx on public.beyblades(category);
create index beyblades_type_idx on public.beyblades(type);

create trigger set_updated_at before update on public.beyblades
  for each row execute function public.set_updated_at();

alter table public.beyblades enable row level security;

create policy "beyblades_select_all" on public.beyblades for select using (true);
create policy "beyblades_write_staff" on public.beyblades for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
