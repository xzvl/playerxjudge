-- Powers the Spectator Mode board's live placement-bracket labels ("3rd
-- Place Match", "5th–8th Place Bracket", ...) — see SpectatorBoard.tsx's
-- `brackets` subscription and lib/final-stage-placeholder.ts's
-- finalStageRoundLabels. New placement brackets get created mid-final-stage
-- as later rounds unlock them (autoAdvanceFinalStage in matches-actions.ts),
-- so without this the board would only ever see whichever brackets existed
-- at page load. No RLS changes needed — already publicly selectable
-- ("brackets_select_all", see 20250101000006_functions_and_rls.sql), same
-- as matches/tournament_stations/judges were before they were added here.
alter publication supabase_realtime add table public.brackets;
