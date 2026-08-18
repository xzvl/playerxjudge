-- ============================================================
-- `code` on beyblades is descriptive part-number metadata (parts from the
-- same release/set can legitimately share one), not a unique identifier —
-- drop the uniqueness constraint added in 20250101000038_beyblades.sql.
-- Only `id` (the primary key) uniquely identifies a beyblade row; nothing
-- else should assume `code` is 1:1 with a row (see the CSV/XLSX importer,
-- app/backend/beyblades/actions.ts, which always inserts rather than
-- upserting by code for this reason).
-- ============================================================

alter table public.beyblades drop constraint beyblades_code_key;
