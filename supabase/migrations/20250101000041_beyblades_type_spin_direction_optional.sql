-- ============================================================
-- `type` (attack/balance/defense/stamina) and `spin_direction` are only
-- meaningful for parts that spin as a whole "blade" on their own (the
-- `blade` and `ratchet_integrated_blade` categories) — Lock Chips,
-- Ratchets, and the individual Custom Line components (Over/Metal/Main/
-- Assist Blade, Bit) don't have an attack/defense/balance/stamina lean or
-- a spin handedness of their own. Both columns were `not null` from
-- 20250101000038_beyblades.sql; relax that so those categories don't need
-- a fabricated placeholder value (see lib/validations/beyblade.ts, which
-- now accepts "" for both and stores it as null).
--
-- The existing `check (type in (...))`/`check (spin_direction in (...))`
-- constraints don't need to change — a CHECK constraint is satisfied
-- whenever any operand is null, so they already allow null rows.
-- ============================================================

alter table public.beyblades alter column type drop not null;
alter table public.beyblades alter column spin_direction drop not null;
