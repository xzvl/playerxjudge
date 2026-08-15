import { z } from "zod";

import type { CommunityStatus } from "@/lib/types/database";

export const COMMUNITY_STATUS_OPTIONS: { value: CommunityStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// The converted WebP upload cap — same budget as the tournament wizard's
// thumbnails (lib/validations/tournament-wizard.ts's MAX_THUMBNAIL_UPLOAD_BYTES).
// The pre-conversion type/size checks happen client-side in
// ThumbnailUploadField, which this reuses as-is.
export const MAX_LOGO_UPLOAD_BYTES = 1.5 * 1024 * 1024;

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3, "Too short").max(100, "Too long"),
  slug: z
    .string()
    .trim()
    .min(3, "Too short")
    .max(80, "Too long")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),

  headquarterName: z.string().trim().max(200, "Too long").default(""),
  addressLine: z.string().trim().max(300, "Too long").default(""),
  city: z.string().trim().max(120, "Too long").default(""),
  province: z.string().trim().max(120, "Too long").default(""),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),

  facebookUrl: z.string().trim().max(300, "Too long").default(""),
  instagramUrl: z.string().trim().max(300, "Too long").default(""),
  youtubeUrl: z.string().trim().max(300, "Too long").default(""),
  messengerUrl: z.string().trim().max(300, "Too long").default(""),

  // "YYYY-MM-DD" (a plain <input type="date"> value) or "" for unset — kept
  // as a string rather than a Date so it round-trips through the form
  // without a timezone-conversion step, same reasoning as the wizard's own
  // *Local datetime strings (lib/format.ts).
  startedAt: z.string().trim().max(10, "Invalid date").default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

export const DEFAULT_CREATE_COMMUNITY_VALUES: CreateCommunityInput = {
  name: "",
  slug: "",
  headquarterName: "",
  addressLine: "",
  city: "",
  province: "",
  latitude: null,
  longitude: null,
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  messengerUrl: "",
  startedAt: "",
  status: "active",
};
