-- "Vary prizes by number of participants" — an alternate prize pool made of
-- multiple sections, each active only when the tournament's actual
-- participant count falls in that section's range. Additive/non-destructive:
-- the existing prize_snake_drafted/prize_same_tier_prizes columns and
-- tournament_prizes table are untouched and keep being written exactly as
-- before regardless of this flag — prize_uses_ranges alone decides which
-- structure is "active" for display (see lib/tournaments/public-listings.ts).
alter table public.tournaments
  add column prize_uses_ranges boolean not null default false,
  add column prize_range_sections jsonb not null default '[]'::jsonb;
