import { z } from "zod";

export const organizerApplicationSchema = z.object({
  tier: z.enum(["free", "premium"]),
});
export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;

// The /become/sponsor role-gate form — just enough to review the
// application. The fuller listing shape (name/website/facebook/logo/tier)
// is sponsorListingSchema below, used once someone's actually creating a
// listing from /account/sponsor/new.
export const sponsorApplicationSchema = z.object({
  companyName: z.string().trim().min(2, "Too short").max(80, "Too long"),
  websiteUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{7,20}$/, "Enter a valid phone number"),
});
export type SponsorApplicationInput = z.infer<typeof sponsorApplicationSchema>;

export const SPONSOR_DONATION_TIERS = ["1_month", "6_months", "1_year"] as const;

export const sponsorListingSchema = z.object({
  sponsorName: z.string().trim().min(2, "Too short").max(80, "Too long"),
  websiteUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  facebookUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  donationTier: z.enum(SPONSOR_DONATION_TIERS, { errorMap: () => ({ message: "Pick a donation tier to continue." }) }),
});
export type SponsorListingInput = z.infer<typeof sponsorListingSchema>;

export type RoleActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
