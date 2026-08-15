// Small app-wide business-rule constants that don't belong to any one
// feature's own module. Real values (unlike lib/mock/*), just not large or
// stateful enough to warrant their own file.

// A free-tier organizer account can run at most this many tournaments —
// enforced today only as a soft nudge (see RevenuePanel's Upgrade banner),
// not a hard write-blocking check.
export const FREE_PLAN_TOURNAMENT_LIMIT = 5;
