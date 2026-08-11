import { z } from "zod";

export const personalInfoSchema = z.object({
  displayName: z.string().trim().min(2, "Too short").max(50, "Too long"),
  firstName: z.string().trim().min(1, "Required").max(50, "Too long"),
  lastName: z.string().trim().min(1, "Required").max(50, "Too long"),
  facebookName: z.string().trim().max(80, "Too long").optional().or(z.literal("")),
  facebookUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
});
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;

export const tournamentInfoSchema = z
  .object({
    bladerNames: z
      .array(z.string().trim().min(1, "Blader name can't be empty").max(40, "Too long"))
      .min(1, "Add at least one blader name"),
    communityIds: z.array(z.string().uuid()).min(1, "Select at least one community"),
    mainCommunityId: z.string().uuid("Pick a main community"),
  })
  .refine((data) => data.communityIds.includes(data.mainCommunityId), {
    message: "Main community must be one of the selected communities",
    path: ["mainCommunityId"],
  });
export type TournamentInfoInput = z.infer<typeof tournamentInfoSchema>;

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type SettingsActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const PHOTO_SLOTS = ["main", "full_body", "half_body"] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];

export const MAX_PHOTO_BYTES = 250 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];
// Generous server-side sanity cap on the converted WebP upload (the 250KB
// limit above applies to the original jpg/png the user picks, before
// client-side conversion).
export const MAX_WEBP_UPLOAD_BYTES = 300 * 1024;
