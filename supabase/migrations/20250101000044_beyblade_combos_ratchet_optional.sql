-- ============================================================
-- A combo built around a Ratchet-Integrated Blade or Ratchet-Integrated
-- Bit doesn't reference a separate `ratchet` row — that single piece
-- already supplies the ratchet layer (a combo only ever has one). Relax
-- `ratchet_id` from `not null` (20250101000042_beyblade_combos_and_decks.sql)
-- so those combos can omit it — see ComboForm
-- (components/dashboard/beyblade/ComboForm.tsx), which hides the Ratchet
-- field entirely once either integrated part is picked.
-- ============================================================

alter table public.beyblade_combos alter column ratchet_id drop not null;
