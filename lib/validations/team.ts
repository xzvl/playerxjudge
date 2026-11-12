import { z } from "zod";

// Converted-WebP upload caps for team images (client converts first, see
// TeamImageField). Covers are wide, so they get a larger budget.
export const MAX_TEAM_LOGO_BYTES = 1.5 * 1024 * 1024;
export const MAX_TEAM_COVER_BYTES = 3 * 1024 * 1024;

const slugSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(48, "At most 48 characters")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens only");

export const teamSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(60, "At most 60 characters"),
  slug: slugSchema,
  tag: z
    .string()
    .trim()
    .max(6, "At most 6 characters")
    .regex(/^[A-Za-z0-9]*$/, "Letters and numbers only")
    .default(""),
  description: z.string().trim().max(500, "At most 500 characters").default(""),
});
export type TeamInput = z.input<typeof teamSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

export const leagueSchema = z
  .object({
    name: z.string().trim().min(2, "At least 2 characters").max(80, "At most 80 characters"),
    startDate: isoDate,
    endDate: isoDate,
    eliteCount: z.coerce.number().int("Whole number").min(1, "At least 1").max(50, "At most 50"),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date", path: ["endDate"] });
export type LeagueInput = z.input<typeof leagueSchema>;

export const battleSchema = z.object({
  outcome: z.enum(["win", "loss"]),
  finish: z.enum(["spin", "burst", "over", "extreme"]),
  playerBeybladeId: z.string().uuid().nullable().default(null),
  opponentBeybladeId: z.string().uuid().nullable().default(null),
});
export type BattleInput = z.input<typeof battleSchema>;

export const leagueMatchSchema = z.object({
  profileId: z.string().uuid("Pick a player"),
  opponentName: z.string().trim().min(1, "Enter the opponent").max(80, "At most 80 characters"),
  opponentTeam: z.string().trim().max(80, "At most 80 characters").default(""),
  playerPoints: z.coerce.number().int("Whole number").min(0, "0 or more").max(99, "At most 99"),
  opponentPoints: z.coerce.number().int("Whole number").min(0, "0 or more").max(99, "At most 99"),
  playedOn: isoDate,
  notes: z.string().trim().max(500, "At most 500 characters").default(""),
  battles: z.array(battleSchema).max(50, "At most 50 battles").default([]),
});
export type LeagueMatchInput = z.input<typeof leagueMatchSchema>;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}
