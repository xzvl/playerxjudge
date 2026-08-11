import { z } from "zod";

export const organizerApplicationSchema = z.object({
  tier: z.enum(["free", "premium"]),
});
export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;

export const sponsorApplicationSchema = z.object({
  companyName: z.string().trim().min(2, "Too short").max(80, "Too long"),
  websiteUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
});
export type SponsorApplicationInput = z.infer<typeof sponsorApplicationSchema>;

export type RoleActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
