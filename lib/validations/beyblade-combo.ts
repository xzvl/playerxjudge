import { z } from "zod";

// A player-owned loadout — see BeybladeCombo (lib/types/database.ts) and
// 20250101000042_beyblade_combos_and_decks.sql. The Blade slot comes from
// one of two mutually exclusive modes (bladeMode): an existing catalog
// pick (bladeId) or a self-assembled one (lockChipId + mainBladeId, or —
// expandBlade — + metalBladeId + overBladeId, always + assistBladeId) —
// see 20250101000045_beyblade_combos_custom_assembly.sql. ratchetId can
// also be "" when the Blade or Bit picked is itself Ratchet-Integrated.
//
// None of these cross-field requirements ("bladeId required iff
// bladeMode is 'existing'", etc.) are enforced here — this schema alone
// can't see which fields matter without knowing bladeMode/expandBlade/
// which catalog category an id belongs to, so ComboForm enforces all of
// it itself (see its onSubmit) rather than here.
export const beybladeComboSchema = z.object({
  name: z.string().trim().min(1, "Required").max(80, "Too long"),
  bladeMode: z.enum(["existing", "custom"]).default("existing"),
  bladeId: z.string().trim(),
  expandBlade: z.boolean().default(false),
  lockChipId: z.string().trim(),
  mainBladeId: z.string().trim(),
  overBladeId: z.string().trim(),
  metalBladeId: z.string().trim(),
  assistBladeId: z.string().trim(),
  ratchetId: z.string().trim(),
  bitId: z.string().trim().min(1, "Pick a bit"),
});

export type BeybladeComboInput = z.infer<typeof beybladeComboSchema>;

export const DEFAULT_BEYBLADE_COMBO_VALUES: BeybladeComboInput = {
  name: "",
  bladeMode: "existing",
  bladeId: "",
  expandBlade: false,
  lockChipId: "",
  mainBladeId: "",
  overBladeId: "",
  metalBladeId: "",
  assistBladeId: "",
  ratchetId: "",
  bitId: "",
};
