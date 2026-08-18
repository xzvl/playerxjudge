-- ============================================================
-- Only one deck per profile can be "the" active deck at a time — enforced
-- at the DB level with a partial unique index, since `is_active` alone
-- (20250101000042_beyblade_combos_and_decks.sql) doesn't stop two decks
-- from both being true. Backs the deck picker on /account/beyblade/deck
-- (see setActiveDeck, app/account/beyblade/actions.ts, which always
-- deactivates whatever's currently active before activating the new one,
-- so this constraint is never mid-violated between the two updates).
-- ============================================================

create unique index beyblade_decks_one_active_per_profile
  on public.beyblade_decks (profile_id)
  where (is_active);
