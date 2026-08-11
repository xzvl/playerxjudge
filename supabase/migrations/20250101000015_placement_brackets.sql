-- ============================================================
-- `brackets` was declared one-per-tournament (`tournament_id uuid unique`)
-- and has never actually been used — the app's real bracket/match data has
-- always lived directly on `matches` (`group_id` for group-stage matches,
-- nothing extra for the main final-stage bracket). We're putting it to use
-- now for placement brackets ("3rd Place Match", "5th–8th Place Bracket",
-- ...): one `brackets` row per placement section (its `structure` jsonb
-- holds the section's key/basePlace/poolSize/feeder info from
-- buildPlacementSections), with that section's `matches` rows pointing at
-- it via the already-existing `matches.bracket_id` column. The main
-- final-stage bracket keeps `bracket_id` null, same as it always has.
-- ============================================================

alter table public.brackets drop constraint brackets_tournament_id_key;
create index brackets_tournament_id_idx on public.brackets (tournament_id);
