-- ============================================================
-- Tournament creation wizard support.
--
-- `format_settings` holds everything the flat columns don't cover:
-- single/two-stage type, group + final stage format and their
-- per-format sub-settings (round robin play-count, Swiss points,
-- split-participants, break-ties + placement-match depth, grand
-- finals modifier), the two tie-break tabs, and bracket display
-- flags. Kept as jsonb rather than a pile of new columns/tables
-- since nothing queries into it yet (no bracket-generation engine
-- exists yet — this stores organizer configuration only).
--
-- `is_archived` is a separate flag from `status`, so a tournament
-- list can offer an "Archive" bucket without overloading the
-- `cancelled` status (archiving is meant to be a reversible
-- "hide from my list" action, distinct from actually cancelling
-- the event).
--
-- `location_name` becomes nullable: the wizard doesn't collect a
-- physical venue (this tool models pure bracket/competition setup,
-- like Challonge), so tournaments created through it have none.
-- ============================================================

alter table public.tournaments
  add column format_settings jsonb not null default '{}'::jsonb,
  add column is_archived boolean not null default false,
  alter column location_name drop not null;

create index tournaments_is_archived_idx on public.tournaments (is_archived);
