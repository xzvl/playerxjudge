-- ============================================================
-- A combo's "Blade" slot can now be filled two ways: an existing catalog
-- Blade (blade_id, as before) or one self-assembled directly from Custom
-- Line parts — Lock Chip + Main Blade (or, expanded, + Metal Blade + Over
-- Blade instead), always + Assist Blade — mirroring the same assembly the
-- admin catalog itself supports for a 'blade' category row (see
-- 20250101000038_beyblades.sql / BeybladeForm's Blade Assembly).
--
-- Exactly one of the two is set per combo — enforced below using
-- lock_chip_id as the "self-assembled" proxy, since it's required either
-- way a self-assembly is used. `on delete cascade` on all 5, same
-- reasoning as blade_id/ratchet_id/bit_id: a combo can't outlive parts it
-- depends on.
--
-- A self-assembled blade has no stats of its own and isn't a real
-- beyblades row — both are computed/synthesized on read (see
-- synthesizeCustomBlade, app/account/beyblade/data.ts), the same way the
-- admin catalog computes a Custom Line Blade's stats from its assembly.
-- ============================================================

alter table public.beyblade_combos
  alter column blade_id drop not null,
  add column lock_chip_id uuid references public.beyblades(id) on delete cascade,
  add column main_blade_id uuid references public.beyblades(id) on delete cascade,
  add column over_blade_id uuid references public.beyblades(id) on delete cascade,
  add column metal_blade_id uuid references public.beyblades(id) on delete cascade,
  add column assist_blade_id uuid references public.beyblades(id) on delete cascade,
  add column expand_blade boolean not null default false,
  add constraint beyblade_combos_blade_xor_assembly check ((blade_id is not null) <> (lock_chip_id is not null));
