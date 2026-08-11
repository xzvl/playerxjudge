-- ============================================================
-- Adds "Start of Pre-Registration" alongside the existing
-- "End of Pre-Registration" (registration_deadline). Nullable since
-- existing rows predate the field — treated as "registration already open"
-- by the app when null.
-- ============================================================

alter table public.tournaments
  add column registration_starts_at timestamptz;
