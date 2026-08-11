-- ============================================================
-- Repoints `matches` at the real, walk-in-friendly roster.
--
-- `matches` (20250101000003) was never populated by the app — bracket/match
-- display has been mock data the whole way through — so this is safe to
-- repoint rather than something needing a data migration. It originally
-- referenced `registrations` (real accounts only); group-stage participants
-- come from `tournament_participants` instead (see 20250101000011), so the
-- FKs move there. `group_id` is new: a match now belongs to one group's
-- round-robin/Swiss schedule, not just the tournament as a whole.
-- ============================================================

alter table public.matches
  drop constraint matches_participant_a_id_fkey,
  drop constraint matches_participant_b_id_fkey,
  drop constraint matches_winner_id_fkey,
  drop constraint matches_tournament_id_round_match_number_key;

alter table public.matches
  add constraint matches_participant_a_id_fkey foreign key (participant_a_id) references public.tournament_participants(id) on delete set null,
  add constraint matches_participant_b_id_fkey foreign key (participant_b_id) references public.tournament_participants(id) on delete set null,
  add constraint matches_winner_id_fkey foreign key (winner_id) references public.tournament_participants(id) on delete set null;

alter table public.matches
  add column group_id uuid references public.tournament_groups(id) on delete cascade;

create index matches_group_id_idx on public.matches (group_id);

-- Match numbers are only meaningful within one group's own round, not
-- tournament-wide (Group A round 1 match 1 and Group B round 1 match 1 both
-- exist independently).
alter table public.matches
  add constraint matches_group_round_number_key unique (tournament_id, group_id, round, match_number);
