import { z } from "zod";

import type { BattleType, BracketFormat, Tournament, TournamentPrize, TournamentStatus, TournamentType } from "@/lib/types/database";
import { utcIsoToManilaLocal } from "@/lib/format";

// ============================================================
// Shared option lists (exact wording/order from the product spec).
// ============================================================

export const RANK_BY_OPTIONS = [
  { value: "match_wins", label: "Match Wins" },
  { value: "game_wins", label: "Game/Set Wins" },
  { value: "game_win_pct", label: "Game/Set Win %" },
  { value: "game_diff", label: "Game/Set W/L Difference" },
  { value: "points_scored", label: "Pts" },
  { value: "points_diff", label: "Pts Diff" },
] as const;
const RANK_BY_VALUES = RANK_BY_OPTIONS.map((o) => o.value) as [string, ...string[]];
export type RankByMetric = (typeof RANK_BY_OPTIONS)[number]["value"];

export const TIE_BREAK_OPTIONS = [
  ...RANK_BY_OPTIONS,
  { value: "wins_vs_tied", label: "Wins vs. Tied Participants" },
  { value: "median_buchholz", label: "Buchholz" },
] as const;
const TIE_BREAK_VALUES = TIE_BREAK_OPTIONS.map((o) => o.value) as [string, ...string[]];
export type TieBreakMetric = (typeof TIE_BREAK_OPTIONS)[number]["value"];

export const STAGE_FORMAT_OPTIONS: { value: BracketFormat; label: string }[] = [
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
  { value: "round_robin", label: "Round Robin" },
  { value: "swiss", label: "Swiss" },
];

export const PLAY_COUNT_OPTIONS = [
  { value: "1", label: "Once" },
  { value: "2", label: "Twice" },
  { value: "3", label: "3 Times" },
];

export const GRAND_FINALS_OPTIONS = [
  { value: "double", label: "2 (must defeat twice)" },
  { value: "single", label: "1 match" },
  { value: "none", label: "None" },
] as const;
export type GrandFinalsModifier = (typeof GRAND_FINALS_OPTIONS)[number]["value"];

export const BATTLE_TYPE_OPTIONS: { value: BattleType; label: string; disabled?: boolean; disabledReason?: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "2v2", label: "2v2", disabled: true, disabledReason: "Coming soon" },
  { value: "3v3", label: "3v3", disabled: true, disabledReason: "Coming soon" },
  { value: "4v4", label: "4v4", disabled: true, disabledReason: "Coming soon" },
  { value: "5v5", label: "5v5", disabled: true, disabledReason: "Coming soon" },
  { value: "team_battle", label: "Team Battle", disabled: true, disabledReason: "Coming soon" },
];

// Stage-format options, per stage — which formats are selectable differs by
// stage (the final stage only supports Single Elimination for now, since
// that's the only format with real bracket generation behind it; group/single
// stage formats support Swiss too since group-stage Swiss is fully built).
// Remove entries from these disabled-sets as each format's engine ships.
const DISABLED_NON_FINAL_FORMATS: BracketFormat[] = ["double_elimination", "round_robin"];
const DISABLED_FINAL_FORMATS: BracketFormat[] = ["swiss", "double_elimination", "round_robin"];

function withDisabled(
  options: { value: BracketFormat; label: string }[],
  disabledValues: BracketFormat[]
): { value: BracketFormat; label: string; disabled?: boolean; disabledReason?: string }[] {
  return options.map((o) =>
    disabledValues.includes(o.value) ? { ...o, disabled: true, disabledReason: "Coming soon" } : o
  );
}

export function stageFormatOptionsFor(stage: "single" | "group" | "final") {
  return withDisabled(STAGE_FORMAT_OPTIONS, stage === "final" ? DISABLED_FINAL_FORMATS : DISABLED_NON_FINAL_FORMATS);
}

export const TOURNAMENT_TIER_OPTIONS: { value: TournamentType; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "emergency", label: "Emergency" },
  { value: "league", label: "League" },
];

// Always-available placements, in the order they should list. "King of
// Swiss" sits between 1st and 2nd Runner-up per the product spec — it's a
// standalone title, not part of the numeric ranking sequence.
export const BASE_PLACEMENTS = ["Champion", "1st Runner-up", "King of Swiss", "2nd Runner-up", "3rd Runner-up"];

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

// The extended placement tiers stop at `cap` — how many players advance out
// of the group stage (the Participants Advance from Each Group field).
// `sameTierPrizes` swaps individual Nth-Runner-up entries for shared
// Top-8/16/32 tiers.
export function buildPlacementOptions(cap: number, sameTierPrizes: boolean): { value: string; label: string }[] {
  const labels = [...BASE_PLACEMENTS];
  if (sameTierPrizes) {
    for (let n = 8; n <= cap; n *= 2) labels.push(`Top ${n} Finalist`);
  } else {
    for (let place = 5; place <= cap; place++) {
      labels.push(`${ordinal(place - 1)} Runner-up`);
    }
  }
  return labels.map((label) => ({ value: label, label }));
}

// Tournament thumbnail uploads (square card image + optional horizontal
// banner) — same "convert to WebP client-side, cap the upload" approach as
// the profile photo uploader (lib/validations/settings.ts), just with more
// headroom since these render much larger.
export const ALLOWED_THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_THUMBNAIL_INPUT_BYTES = 8 * 1024 * 1024; // before conversion
export const MAX_THUMBNAIL_UPLOAD_BYTES = 1.5 * 1024 * 1024; // the converted WebP actually stored

export function isPowerOfTwo(n: number) {
  return Number.isInteger(n) && n >= 1 && (n & (n - 1)) === 0;
}

// ============================================================
// Schema
// ============================================================

const bracketFormatSchema = z.enum(["single_elimination", "double_elimination", "round_robin", "swiss"]);
const playCountSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const rankByMetricSchema = z.enum(RANK_BY_VALUES as [RankByMetric, ...RankByMetric[]]);
const tieBreakMetricSchema = z.enum(TIE_BREAK_VALUES as [TieBreakMetric, ...TieBreakMetric[]]);

const swissPointsSchema = z.object({
  pointsPerMatchWin: z.coerce.number().min(0).max(10).default(1),
  pointsPerMatchTie: z.coerce.number().min(0).max(10).default(0.5),
  pointsPerGameWin: z.coerce.number().min(0).max(10).default(0),
  pointsPerGameTie: z.coerce.number().min(0).max(10).default(0),
  pointsPerBye: z.coerce.number().min(0).max(10).default(1),
});
export type SwissPoints = z.infer<typeof swissPointsSchema>;

const groupStageSchema = z.object({
  format: bracketFormatSchema.default("swiss"),
  roundRobinPlayCount: playCountSchema.default(1),
  roundRobinRankBy: rankByMetricSchema.default("match_wins"),
  swissPoints: swissPointsSchema,
  // Rounds per group when the group format is Swiss — see the Group Stage
  // page's "Start Group Stage" panel, not collected in the wizard itself.
  swissRounds: z.coerce.number().int().min(1).max(20).default(5),
  splitParticipants: z.boolean().default(false),
  participantsPerGroup: z.coerce.number().int().min(2).max(512).default(8),
  participantsAdvancePerGroup: z.coerce.number().int().min(1).max(512).default(4),
});
export type GroupStageConfig = z.infer<typeof groupStageSchema>;

const finalStageSchema = z.object({
  format: bracketFormatSchema.default("single_elimination"),
  roundRobinPlayCount: playCountSchema.default(1),
  roundRobinRankBy: rankByMetricSchema.default("match_wins"),
  swissPoints: swissPointsSchema,
  splitParticipants: z.boolean().default(false),
  breakTiesWithPlacementMatches: z.boolean().default(false),
  breakTiesThroughPlace: z.coerce.number().int().min(3).max(16).optional(),
  grandFinalsModifier: z.enum(["double", "single", "none"]).default("double"),
});
export type FinalStageConfig = z.infer<typeof finalStageSchema>;

const tieBreaksSchema = z.object({
  tieBreak1: tieBreakMetricSchema.default("points_diff"),
  tieBreak2: tieBreakMetricSchema.default("points_scored"),
  tieBreak3: tieBreakMetricSchema.default("median_buchholz"),
});
export type TieBreaksConfig = z.infer<typeof tieBreaksSchema>;

const bracketOptionsSchema = z.object({
  showCustomRoundLabels: z.boolean().default(false),
  hideSeedNumbers: z.boolean().default(false),
  hideBracketPreview: z.boolean().default(false),
  quickAdvance: z.boolean().default(false),
  allowMatchAttachments: z.boolean().default(false),
});
export type BracketOptionsConfig = z.infer<typeof bracketOptionsSchema>;

const battleTypeSchema = z.enum(["solo", "2v2", "3v3", "4v4", "5v5", "team_battle"]);
const tournamentTypeSchema = z.enum(["casual", "minor", "major", "emergency", "league"]);

const prizeEntrySchema = z.object({
  placement: z.string().min(1, "Pick a placement"),
  prizeName: z.string().trim().min(1, "Required").max(120, "Too long"),
});
export type PrizeEntry = z.infer<typeof prizeEntrySchema>;

// One alternate prize structure, active only when the tournament's actual
// participant count (once real registrations exist) falls in
// [rangeStart, rangeEnd] — see "Vary prizes by number of participants" in
// PrizePoolSection and the display-side pick in
// lib/tournaments/public-listings.ts#mapRow.
const prizeRangeSectionSchema = z.object({
  rangeStart: z.coerce.number().int().min(1),
  rangeEnd: z.coerce.number().int().min(1),
  snakeDrafted: z.boolean().default(false),
  sameTierPrizes: z.boolean().default(false),
  prizes: z.array(prizeEntrySchema).default([]),
});
export type PrizeRangeSection = z.infer<typeof prizeRangeSectionSchema>;

const prizePoolSchema = z.object({
  snakeDrafted: z.boolean().default(false),
  sameTierPrizes: z.boolean().default(false),
  prizes: z.array(prizeEntrySchema).default([]),
  useParticipantRanges: z.boolean().default(false),
  rangeSections: z.array(prizeRangeSectionSchema).default([]),
});
export type PrizePoolConfig = z.infer<typeof prizePoolSchema>;

// Shared between the top-level prize list and each participant-range
// section — skipped entirely when snake-drafted, since drafted prizes
// aren't tied to a fixed placement at all.
function validatePrizeList(
  prizes: PrizeEntry[],
  cap: number,
  sameTierPrizes: boolean,
  snakeDrafted: boolean,
  ctx: z.RefinementCtx,
  basePath: (string | number)[]
) {
  if (snakeDrafted) return;
  const validPlacements = new Set(buildPlacementOptions(cap, sameTierPrizes).map((o) => o.value));
  const seenPlacements = new Set<string>();
  prizes.forEach((prize, i) => {
    if (seenPlacements.has(prize.placement)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each placement can only be used once",
        path: [...basePath, i, "placement"],
      });
    }
    seenPlacements.add(prize.placement);

    if (!validPlacements.has(prize.placement)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This placement isn't available with your current bracket settings",
        path: [...basePath, i, "placement"],
      });
    }
  });
}

export const createTournamentSchema = z
  .object({
    hostCommunityId: z.string().uuid().nullable(),
    title: z.string().trim().min(3, "Too short").max(100, "Too long"),
    slug: z
      .string()
      .trim()
      .min(3, "Too short")
      .max(80, "Too long")
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
    shortDescription: z.string().trim().min(10, "Too short").max(200, "Too long"),
    description: z.string().trim().max(20000, "Too long").default(""),

    battleType: battleTypeSchema.default("solo"),
    tournamentType: tournamentTypeSchema.default("casual"),

    locationName: z.string().trim().max(200, "Too long").default(""),
    addressLine: z.string().trim().max(300, "Too long").default(""),
    city: z.string().trim().max(120, "Too long").default(""),
    province: z.string().trim().max(120, "Too long").default(""),
    latitude: z.number().min(-90).max(90).nullable().default(null),
    longitude: z.number().min(-180).max(180).nullable().default(null),

    prizePool: prizePoolSchema,

    stageType: z.enum(["single_stage", "two_stage"]).default("single_stage"),
    singleStageFormat: bracketFormatSchema.default("single_elimination"),
    groupStage: groupStageSchema,
    finalStage: finalStageSchema,

    groupTieBreaks: tieBreaksSchema,
    finalTieBreaks: tieBreaksSchema,
    bracketOptions: bracketOptionsSchema,

    registrationFeeType: z.enum(["free", "paid"]).default("free"),
    entryFee: z.coerce.number().min(0).max(1_000_000).default(0),
    // Settings-only (see TournamentSettingsPanel) — the New wizard never
    // shows these, but they still need schema defaults since it shares
    // createTournamentSchema. QR image isn't here: like thumbnail_url, it
    // uploads immediately via its own action, not through form submit.
    requiresPreregistrationPayment: z.boolean().default(false),
    preregistrationAmount: z.coerce.number().min(0).max(1_000_000).default(0),
    preregistrationInstructions: z.string().trim().max(2000, "Too long").default(""),
    // datetime-local values, interpreted as Asia/Manila wall time — see
    // lib/format.ts#manilaLocalToUtcIso for the conversion to a real instant.
    registrationStartLocal: z.string().min(1, "Required"),
    registrationDeadlineLocal: z.string().min(1, "Required"),
    startsAtLocal: z.string().min(1, "Required"),
  })
  .superRefine((data, ctx) => {
    if (data.registrationFeeType === "paid" && data.entryFee <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter an entry fee greater than 0 for a paid tournament",
        path: ["entryFee"],
      });
    }

    if (data.requiresPreregistrationPayment && data.preregistrationAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a pre-registration amount greater than 0",
        path: ["preregistrationAmount"],
      });
    }

    const prizeCap = data.stageType === "two_stage" ? data.groupStage.participantsAdvancePerGroup : 4;

    if (data.prizePool.useParticipantRanges) {
      if (data.prizePool.rangeSections.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least one participant range",
          path: ["prizePool", "rangeSections"],
        });
      }

      data.prizePool.rangeSections.forEach((section, i) => {
        if (section.rangeEnd < section.rangeStart) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Must be at or after the start of the range",
            path: ["prizePool", "rangeSections", i, "rangeEnd"],
          });
        }
        validatePrizeList(section.prizes, prizeCap, section.sameTierPrizes, section.snakeDrafted, ctx, [
          "prizePool",
          "rangeSections",
          i,
          "prizes",
        ]);
      });

      // Overlap check across sections — sort by start and compare neighbors.
      const sortedSections = data.prizePool.rangeSections
        .map((section, i) => ({ ...section, i }))
        .sort((a, b) => a.rangeStart - b.rangeStart);
      for (let k = 1; k < sortedSections.length; k++) {
        if (sortedSections[k].rangeStart <= sortedSections[k - 1].rangeEnd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "This range overlaps another section",
            path: ["prizePool", "rangeSections", sortedSections[k].i, "rangeStart"],
          });
        }
      }
    } else {
      validatePrizeList(data.prizePool.prizes, prizeCap, data.prizePool.sameTierPrizes, data.prizePool.snakeDrafted, ctx, [
        "prizePool",
        "prizes",
      ]);
    }

    if (data.stageType === "two_stage") {
      const isElimGroup = data.groupStage.format === "single_elimination" || data.groupStage.format === "double_elimination";
      if (isElimGroup && !isPowerOfTwo(data.groupStage.participantsAdvancePerGroup)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Must be a power of 2 (1, 2, 4, 8, 16, ...) for single/double elimination groups",
          path: ["groupStage", "participantsAdvancePerGroup"],
        });
      }
      if (data.groupStage.participantsAdvancePerGroup > data.groupStage.participantsPerGroup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Can't advance more participants than compete in each group",
          path: ["groupStage", "participantsAdvancePerGroup"],
        });
      }

      if (data.finalStage.breakTiesWithPlacementMatches) {
        const maxPlace = Math.min(16, data.groupStage.participantsAdvancePerGroup);
        if (data.finalStage.breakTiesThroughPlace === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Pick how far placement matches break ties",
            path: ["finalStage", "breakTiesThroughPlace"],
          });
        } else if (data.finalStage.breakTiesThroughPlace > maxPlace) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Can't exceed ${maxPlace} given how many participants advance from each group`,
            path: ["finalStage", "breakTiesThroughPlace"],
          });
        }
      }
    }

    if (
      data.registrationStartLocal &&
      data.registrationDeadlineLocal &&
      data.registrationStartLocal > data.registrationDeadlineLocal
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pre-registration must start on or before it ends",
        path: ["registrationStartLocal"],
      });
    }

    if (data.registrationDeadlineLocal && data.startsAtLocal && data.registrationDeadlineLocal > data.startsAtLocal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pre-registration must end on or before the tournament start",
        path: ["registrationDeadlineLocal"],
      });
    }
  });

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

// Shape persisted to `tournaments.format_settings` — everything the flat
// columns don't cover. Kept distinct from CreateTournamentInput so the form
// can carry a few extra client-only fields later without touching storage.
export interface TournamentFormatSettings {
  stageType: "single_stage" | "two_stage";
  singleStageFormat: BracketFormat;
  groupStage: GroupStageConfig;
  finalStage: FinalStageConfig;
  groupTieBreaks: TieBreaksConfig;
  finalTieBreaks: TieBreaksConfig;
  bracketOptions: BracketOptionsConfig;
  // Not a wizard field — flipped by the "End of Group Stage" button on the
  // workspace page itself (see endGroupStage in matches-actions.ts), merged
  // in directly the same way swissRounds is, not through the create/edit form.
  groupStageEnded?: boolean;
  // Not a wizard field — flipped by the "Start the Final Stage" button (see
  // startFinalStage in matches-actions.ts) once Round 1 of the final bracket
  // has been generated from the group standings.
  finalStageStarted?: boolean;
}

export function toFormatSettings(input: CreateTournamentInput): TournamentFormatSettings {
  return {
    stageType: input.stageType,
    singleStageFormat: input.singleStageFormat,
    groupStage: input.groupStage,
    finalStage: input.finalStage,
    groupTieBreaks: input.groupTieBreaks,
    finalTieBreaks: input.finalTieBreaks,
    bracketOptions: input.bracketOptions,
  };
}

// The `bracket_format` column represents the format that ultimately decides
// the champion: the final stage's format for two-stage tournaments, or the
// single stage's format otherwise.
export function resolveBracketFormat(input: CreateTournamentInput): BracketFormat {
  return input.stageType === "two_stage" ? input.finalStage.format : input.singleStageFormat;
}

// Once a tournament reaches "completed" or "cancelled", the Settings form
// falls back to status/archive controls only — nothing else is editable.
// "ongoing" (the group stage has started) is still broadly editable; a
// narrower set of fields that are load-bearing for in-progress match state
// (slug, single-vs-two-stage toggle, group format, the three schedule
// dates, group tie breaks) lock separately once the group stage has
// actually started — see groupStageStarted's callers in
// TournamentSettingsPanel and updateTournamentDetails, not this list.
export const EDITABLE_TOURNAMENT_STATUSES: TournamentStatus[] = [
  "draft",
  "published",
  "registration_open",
  "registration_closed",
  "ongoing",
];

export function isTournamentEditable(status: TournamentStatus): boolean {
  return EDITABLE_TOURNAMENT_STATUSES.includes(status);
}

// The inverse of the create flow — reconstructs wizard form values from a
// real `tournaments` row (plus its separately-fetched prize rows), so the
// Settings page can reuse the same form.
export function tournamentToFormValues(tournament: Tournament, prizes: TournamentPrize[] = []): CreateTournamentInput {
  const settings = tournament.format_settings;
  return {
    hostCommunityId: tournament.community_id,
    title: tournament.title,
    slug: tournament.slug,
    shortDescription: tournament.short_description,
    description: tournament.description,
    battleType: tournament.battle_type,
    tournamentType: tournament.tournament_type,
    locationName: tournament.location_name ?? "",
    addressLine: tournament.address_line ?? "",
    city: tournament.city ?? "",
    province: tournament.province ?? "",
    latitude: tournament.latitude,
    longitude: tournament.longitude,
    prizePool: {
      snakeDrafted: tournament.prize_snake_drafted,
      sameTierPrizes: tournament.prize_same_tier_prizes,
      prizes: [...prizes]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => ({ placement: p.placement, prizeName: p.prize_name })),
      useParticipantRanges: tournament.prize_uses_ranges,
      rangeSections: tournament.prize_range_sections,
    },
    stageType: settings?.stageType ?? DEFAULT_CREATE_TOURNAMENT_VALUES.stageType,
    singleStageFormat: settings?.singleStageFormat ?? DEFAULT_CREATE_TOURNAMENT_VALUES.singleStageFormat,
    groupStage: settings?.groupStage ?? DEFAULT_CREATE_TOURNAMENT_VALUES.groupStage,
    finalStage: settings?.finalStage ?? DEFAULT_CREATE_TOURNAMENT_VALUES.finalStage,
    groupTieBreaks: settings?.groupTieBreaks ?? DEFAULT_CREATE_TOURNAMENT_VALUES.groupTieBreaks,
    finalTieBreaks: settings?.finalTieBreaks ?? DEFAULT_CREATE_TOURNAMENT_VALUES.finalTieBreaks,
    bracketOptions: settings?.bracketOptions ?? DEFAULT_CREATE_TOURNAMENT_VALUES.bracketOptions,
    registrationFeeType: tournament.entry_fee > 0 ? "paid" : "free",
    entryFee: tournament.entry_fee,
    requiresPreregistrationPayment: tournament.requires_preregistration_payment,
    preregistrationAmount: tournament.preregistration_amount ?? 0,
    preregistrationInstructions: tournament.preregistration_instructions ?? "",
    registrationStartLocal: tournament.registration_starts_at ? utcIsoToManilaLocal(tournament.registration_starts_at) : "",
    registrationDeadlineLocal: tournament.registration_deadline ? utcIsoToManilaLocal(tournament.registration_deadline) : "",
    startsAtLocal: utcIsoToManilaLocal(tournament.starts_at),
  };
}

export const DEFAULT_SWISS_POINTS: SwissPoints = {
  pointsPerMatchWin: 1,
  pointsPerMatchTie: 0.5,
  pointsPerGameWin: 0,
  pointsPerGameTie: 0,
  pointsPerBye: 1,
};

export const DEFAULT_TIE_BREAKS: TieBreaksConfig = {
  tieBreak1: "points_diff",
  tieBreak2: "points_scored",
  tieBreak3: "median_buchholz",
};

export const DEFAULT_CREATE_TOURNAMENT_VALUES: CreateTournamentInput = {
  hostCommunityId: null,
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  battleType: "solo",
  tournamentType: "casual",
  locationName: "",
  addressLine: "",
  city: "",
  province: "",
  latitude: null,
  longitude: null,
  prizePool: { snakeDrafted: false, sameTierPrizes: false, prizes: [], useParticipantRanges: false, rangeSections: [] },
  stageType: "single_stage",
  singleStageFormat: "single_elimination",
  groupStage: {
    format: "swiss",
    roundRobinPlayCount: 1,
    roundRobinRankBy: "match_wins",
    swissPoints: DEFAULT_SWISS_POINTS,
    swissRounds: 5,
    splitParticipants: false,
    participantsPerGroup: 8,
    participantsAdvancePerGroup: 4,
  },
  finalStage: {
    format: "single_elimination",
    roundRobinPlayCount: 1,
    roundRobinRankBy: "match_wins",
    swissPoints: DEFAULT_SWISS_POINTS,
    splitParticipants: false,
    breakTiesWithPlacementMatches: false,
    breakTiesThroughPlace: undefined,
    grandFinalsModifier: "double",
  },
  groupTieBreaks: DEFAULT_TIE_BREAKS,
  finalTieBreaks: DEFAULT_TIE_BREAKS,
  bracketOptions: {
    showCustomRoundLabels: false,
    hideSeedNumbers: false,
    hideBracketPreview: false,
    quickAdvance: false,
    allowMatchAttachments: false,
  },
  registrationFeeType: "free",
  entryFee: 0,
  requiresPreregistrationPayment: false,
  preregistrationAmount: 0,
  preregistrationInstructions: "",
  registrationStartLocal: "",
  registrationDeadlineLocal: "",
  startsAtLocal: "",
};
