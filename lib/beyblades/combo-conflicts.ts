import type { BladePartRole, ComboPartOption, ComboPickerOptions, ComboWithParts } from "@/app/account/beyblade/data";
import type { BeybladeComboInput } from "@/lib/validations/beyblade-combo";

// A deck slot's combo occupies one "role" per physical piece — the whole
// existing catalog Blade, or (self-assembled) each of its sub-parts, plus
// Ratchet and Bit. Lines up 1:1 with a ComboPickerOptions list, so a
// conflict on this role can offer a same-category replacement.
export type ComboPartRole = "blade" | BladePartRole | "ratchet" | "bit";

export const COMBO_PART_ROLE_LABELS: Record<ComboPartRole, string> = {
  blade: "Blade",
  lockChip: "Lock Chip",
  mainBlade: "Main Blade",
  metalBlade: "Metal Blade",
  overBlade: "Over Blade",
  assistBlade: "Assist Blade",
  ratchet: "Ratchet",
  bit: "Bit",
};

export function pickerListForRole(role: ComboPartRole, options: ComboPickerOptions): ComboPartOption[] {
  switch (role) {
    case "blade":
      return options.blades;
    case "lockChip":
      return options.lockChips;
    case "mainBlade":
      return options.mainBlades;
    case "metalBlade":
      return options.metalBlades;
    case "overBlade":
      return options.overBlades;
    case "assistBlade":
      return options.assistBlades;
    case "ratchet":
      return options.ratchets;
    case "bit":
      return options.bits;
  }
}

export interface RoledComboPart {
  role: ComboPartRole;
  part: ComboPartOption;
}

// Every real catalog part a combo occupies, tagged with which role it
// fills — a player only owns one of each physical piece, so two combos in
// the same deck can't share any of these. See roledComboParts.
export function roledComboParts(combo: ComboWithParts): RoledComboPart[] {
  const roled: RoledComboPart[] = [];
  if (combo.blade.id) {
    roled.push({ role: "blade", part: combo.blade });
  } else {
    for (const [role, part] of Object.entries(combo.bladeRoles) as [BladePartRole, ComboPartOption | undefined][]) {
      if (part) roled.push({ role, part });
    }
  }
  if (combo.ratchet) roled.push({ role: "ratchet", part: combo.ratchet });
  roled.push({ role: "bit", part: combo.bit });
  return roled;
}

// Most Lock Chips are common enough that a player can reasonably own more
// than one, so they're exempt from the "one physical part per deck" rule —
// except a couple that are effectively single-copy/rare. Every other
// role's part (Blade, Main/Metal/Over/Assist Blade, Ratchet, Bit) stays
// exclusive as before.
const EXCLUSIVE_LOCK_CHIP_NAMES = ["emperor", "valkyrie"];

function isDeckExclusive(role: ComboPartRole, part: ComboPartOption): boolean {
  if (role !== "lockChip") return true;
  const name = part.name.toLowerCase();
  const shortName = part.shortName.toLowerCase();
  return EXCLUSIVE_LOCK_CHIP_NAMES.some((n) => name.includes(n) || shortName.includes(n));
}

// roledComboParts, filtered down to only the parts the "one physical part
// per deck" rule actually applies to — see isDeckExclusive.
function exclusiveComboParts(combo: ComboWithParts): RoledComboPart[] {
  return roledComboParts(combo).filter(({ role, part }) => isDeckExclusive(role, part));
}

export interface ComboConflict {
  role: ComboPartRole;
  part: ComboPartOption;
  // The other deck slot's combo this part is already used by.
  conflictsWithComboName: string;
}

// Which of `candidate`'s parts are already used by any combo in
// `otherSlots` (the deck's other slots — pass the slot being assigned to
// as null/excluded so a combo never conflicts with itself). [] means it's
// safe to assign as-is. A shared non-exclusive Lock Chip (see
// isDeckExclusive) never counts as a conflict.
export function findComboConflicts(candidate: ComboWithParts, otherSlots: (ComboWithParts | null)[]): ComboConflict[] {
  const conflicts: ComboConflict[] = [];
  const candidateParts = exclusiveComboParts(candidate);
  for (const other of otherSlots) {
    if (!other || other.id === candidate.id) continue;
    const otherIds = new Set(exclusiveComboParts(other).map((r) => r.part.id));
    for (const { role, part } of candidateParts) {
      if (otherIds.has(part.id)) conflicts.push({ role, part, conflictsWithComboName: other.name });
    }
  }
  return conflicts;
}

// Every exclusive (see isDeckExclusive) part id already spoken for by the
// deck's other slots — replacement pickers exclude these so resolving one
// conflict can't create another. A shared non-exclusive Lock Chip is never
// "taken".
export function takenPartIds(otherSlots: (ComboWithParts | null)[]): Set<string> {
  const ids = new Set<string>();
  for (const combo of otherSlots) {
    if (!combo) continue;
    for (const { part } of exclusiveComboParts(combo)) ids.add(part.id);
  }
  return ids;
}

// Builds the input to save `candidate` as a new combo with its conflicting
// parts swapped for `replacements` (role -> replacement part id) — used by
// AssignComboDialog's force-past-a-conflict flow. Replacing the "blade"
// role (an existing catalog Blade) swaps bladeId directly; replacing any
// of the self-assembly roles keeps bladeMode "custom" with that one part
// swapped, the rest carried over unchanged from `candidate`.
export function buildReplacementComboInput(
  candidate: ComboWithParts,
  replacements: Partial<Record<ComboPartRole, string>>,
  name: string
): BeybladeComboInput {
  const pick = (role: ComboPartRole, fallback: string) => replacements[role] ?? fallback;

  if (candidate.blade.id) {
    return {
      name,
      bladeMode: "existing",
      bladeId: pick("blade", candidate.blade.id),
      expandBlade: false,
      lockChipId: "",
      mainBladeId: "",
      overBladeId: "",
      metalBladeId: "",
      assistBladeId: "",
      ratchetId: pick("ratchet", candidate.ratchet?.id ?? ""),
      bitId: pick("bit", candidate.bit.id),
    };
  }

  return {
    name,
    bladeMode: "custom",
    bladeId: "",
    expandBlade: candidate.blade.expandBlade,
    lockChipId: pick("lockChip", candidate.bladeRoles.lockChip?.id ?? ""),
    mainBladeId: pick("mainBlade", candidate.bladeRoles.mainBlade?.id ?? ""),
    overBladeId: pick("overBlade", candidate.bladeRoles.overBlade?.id ?? ""),
    metalBladeId: pick("metalBlade", candidate.bladeRoles.metalBlade?.id ?? ""),
    assistBladeId: pick("assistBlade", candidate.bladeRoles.assistBlade?.id ?? ""),
    ratchetId: pick("ratchet", candidate.ratchet?.id ?? ""),
    bitId: pick("bit", candidate.bit.id),
  };
}

// role -> part id map for whatever `buildReplacementComboInput` would
// actually save — candidate's own parts with each conflicting one swapped
// for its replacement, everything else carried over unchanged.
function resultingPartIds(candidate: ComboWithParts, replacements: Partial<Record<ComboPartRole, string>>): Map<ComboPartRole, string> {
  const result = new Map<ComboPartRole, string>();
  for (const { role, part } of roledComboParts(candidate)) result.set(role, replacements[role] ?? part.id);
  return result;
}

function comboPartIdMap(combo: ComboWithParts): Map<ComboPartRole, string> {
  const map = new Map<ComboPartRole, string>();
  for (const { role, part } of roledComboParts(combo)) map.set(role, part.id);
  return map;
}

function samePartIdMap(a: Map<ComboPartRole, string>, b: Map<ComboPartRole, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [role, id] of a) {
    if (b.get(role) !== id) return false;
  }
  return true;
}

// If forcing `candidate` past a conflict with `replacements` would produce
// the exact same [role -> part id] makeup as a combo the player's already
// saved — most likely because they (or a previous force-assign) already
// made this exact swap before — returns that combo so the caller can just
// assign it directly instead of saving a redundant duplicate. null if this
// exact combination has never been saved.
export function findExistingReplacementCombo(
  candidate: ComboWithParts,
  replacements: Partial<Record<ComboPartRole, string>>,
  savedCombos: ComboWithParts[]
): ComboWithParts | null {
  const target = resultingPartIds(candidate, replacements);
  return savedCombos.find((combo) => samePartIdMap(comboPartIdMap(combo), target)) ?? null;
}
