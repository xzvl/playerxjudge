import { z } from "zod";

import type {
  BeybladeCategory,
  BeybladeSeries,
  BeybladeSpinDirection,
  BeybladeSystemLine,
  BeybladeType,
} from "@/lib/types/database";

// The converted WebP upload cap — same budget as the tournament wizard's
// thumbnails (lib/validations/tournament-wizard.ts's
// MAX_THUMBNAIL_UPLOAD_BYTES). The pre-conversion type/size checks happen
// client-side in ThumbnailUploadField, which this reuses as-is.
export const MAX_BEYBLADE_IMAGE_UPLOAD_BYTES = 1.5 * 1024 * 1024;

export const BEYBLADE_TYPE_OPTIONS: { value: BeybladeType; label: string }[] = [
  { value: "attack", label: "Attack" },
  { value: "balance", label: "Balance" },
  { value: "defense", label: "Defense" },
  { value: "stamina", label: "Stamina" },
];

export const BEYBLADE_SERIES_OPTIONS: { value: BeybladeSeries; label: string }[] = [
  { value: "plastic_generation", label: "Plastic Generation" },
  { value: "metal_generation", label: "Metal Generation" },
  { value: "burst_generation", label: "Burst Generation" },
  { value: "x_generation", label: "X Generation" },
];

export const BEYBLADE_SYSTEM_LINE_OPTIONS: { value: BeybladeSystemLine; label: string }[] = [
  { value: "basic_line", label: "Basic Line" },
  { value: "unique_line", label: "Unique Line" },
  { value: "custom_line", label: "Custom Line" },
];

// "Blade" is the composite piece assembled (for Custom Line) from the
// component categories above it — see BeybladeForm's conditional fields.
export const BEYBLADE_CATEGORY_OPTIONS: { value: BeybladeCategory; label: string }[] = [
  { value: "lock_chip", label: "Lock Chip" },
  { value: "main_blade", label: "Main Blade" },
  { value: "over_blade", label: "Over Blade" },
  { value: "metal_blade", label: "Metal Blade" },
  { value: "assist_blade", label: "Assist Blade" },
  { value: "blade", label: "Blade" },
  { value: "ratchet_integrated_blade", label: "Ratchet-Integrated Blade" },
  { value: "ratchet", label: "Ratchet" },
  { value: "bit", label: "Bit" },
  { value: "ratchet_integrated_bit", label: "Ratchet-Integrated Bit" },
];

export const BEYBLADE_SPIN_DIRECTION_OPTIONS: { value: BeybladeSpinDirection; label: string }[] = [
  { value: "right", label: "Right" },
  { value: "left", label: "Left" },
  { value: "dual", label: "Dual" },
];

function labelMap<T extends string>(options: { value: T; label: string }[]): Record<T, string> {
  return Object.fromEntries(options.map((o) => [o.value, o.label])) as Record<T, string>;
}

export const BEYBLADE_TYPE_LABELS = labelMap(BEYBLADE_TYPE_OPTIONS);
export const BEYBLADE_SERIES_LABELS = labelMap(BEYBLADE_SERIES_OPTIONS);
export const BEYBLADE_SYSTEM_LINE_LABELS = labelMap(BEYBLADE_SYSTEM_LINE_OPTIONS);
export const BEYBLADE_CATEGORY_LABELS = labelMap(BEYBLADE_CATEGORY_OPTIONS);
export const BEYBLADE_SPIN_DIRECTION_LABELS = labelMap(BEYBLADE_SPIN_DIRECTION_OPTIONS);

const CATEGORY_VALUES = BEYBLADE_CATEGORY_OPTIONS.map((o) => o.value) as [BeybladeCategory, ...BeybladeCategory[]];

// Stat fields (Attack/Defense/Stamina/Height/Dash/Burst Resistance) — kept
// as strings so a number input can be blank (unrated), converted to
// number | null at the server-action boundary (see toBeybladeRow,
// app/backend/beyblades/actions.ts).
const statField = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number")
  .default("");

// A self-reference picker's value: either "" (none picked yet) or another
// beyblade's id — free-form rather than z.string().uuid() so an empty
// selection doesn't fail validation.
const referenceField = z.string().trim().default("");

export const beybladeSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120, "Too long"),
  shortName: z.string().trim().min(1, "Required").max(60, "Too long"),
  code: z.string().trim().min(1, "Required").max(40, "Too long"),
  type: z.enum(["attack", "balance", "defense", "stamina"], { errorMap: () => ({ message: "Pick a type" }) }),
  spinDirection: z.enum(["right", "left", "dual"], { errorMap: () => ({ message: "Pick a spin direction" }) }),
  attack: statField,
  defense: statField,
  stamina: statField,
  height: statField,
  dash: statField,
  burstResistance: statField,
  description: z.string().trim().max(2000, "Too long").default(""),
  series: z
    .enum(["plastic_generation", "metal_generation", "burst_generation", "x_generation"])
    .default("x_generation"),
  systemLine: z.enum(["basic_line", "unique_line", "custom_line"], { errorMap: () => ({ message: "Pick a system line" }) }),
  category: z.enum(CATEGORY_VALUES, { errorMap: () => ({ message: "Pick a category" }) }),
  // Only read when systemLine === "custom_line" && category === "blade" —
  // see BeybladeForm. Harmless to keep set (and just ignored) otherwise
  // rather than clearing it, so switching System Line/Category back and
  // forth doesn't lose the admin's picks.
  expandBlade: z.boolean().default(false),
  lockChipId: referenceField,
  mainBladeId: referenceField,
  overBladeId: referenceField,
  metalBladeId: referenceField,
  assistBladeId: referenceField,
});

export type BeybladeInput = z.infer<typeof beybladeSchema>;

export const DEFAULT_BEYBLADE_VALUES: BeybladeInput = {
  name: "",
  shortName: "",
  code: "",
  type: "attack",
  spinDirection: "right",
  attack: "",
  defense: "",
  stamina: "",
  height: "",
  dash: "",
  burstResistance: "",
  description: "",
  series: "x_generation",
  systemLine: "basic_line",
  category: "blade",
  expandBlade: false,
  lockChipId: "",
  mainBladeId: "",
  overBladeId: "",
  metalBladeId: "",
  assistBladeId: "",
};
