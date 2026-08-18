"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Plus, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ComboPartsLine, ComboThumbnails, PartThumbnail } from "@/components/dashboard/beyblade/combo-ui";
import { createComboAndFetch } from "@/app/account/beyblade/actions";
import {
  buildReplacementComboInput,
  COMBO_PART_ROLE_LABELS,
  findComboConflicts,
  findExistingReplacementCombo,
  pickerListForRole,
  takenPartIds,
  type ComboConflict,
  type ComboPartRole,
} from "@/lib/beyblades/combo-conflicts";
import type { ComboPartOption, ComboPickerOptions, ComboWithParts } from "@/app/account/beyblade/data";

type Step =
  | { kind: "pick" }
  | { kind: "conflict"; combo: ComboWithParts; conflicts: ComboConflict[] }
  | { kind: "replace"; combo: ComboWithParts; conflicts: ComboConflict[]; replacements: Partial<Record<ComboPartRole, string>> };

// A deck holds 3 combos, but a player only owns one of each physical part —
// so a combo that shares a Blade/Lock Chip/.../Ratchet/Bit with one already
// in this deck's other slots can't just be assigned outright. This dialog
// walks: pick a combo -> (if it conflicts) show what it shares and with
// which combo -> force past it by picking a same-category replacement for
// every conflicting part -> saves that as a new real combo (so it shows up
// on the Combos list too, editable/reusable like any other) and assigns
// *that* to the slot instead. Shared by DeckSlots and DeckRows.
export function AssignComboDialog({
  open,
  onOpenChange,
  availableCombos,
  usedComboIds,
  otherSlotCombos,
  pickerOptions,
  pending,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCombos: ComboWithParts[];
  usedComboIds: Set<string>;
  // The deck's other slots (excluding the one being assigned to) — what a
  // candidate combo's parts get checked against.
  otherSlotCombos: (ComboWithParts | null)[];
  pickerOptions: ComboPickerOptions;
  pending: boolean;
  onAssign: (combo: ComboWithParts) => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep({ kind: "pick" });
    setCreating(false);
    setError(null);
  }

  function handlePick(combo: ComboWithParts) {
    const conflicts = findComboConflicts(combo, otherSlotCombos);
    if (conflicts.length === 0) {
      onAssign(combo);
      return;
    }
    setError(null);
    setStep({ kind: "conflict", combo, conflicts });
  }

  function handleForce() {
    if (step.kind !== "conflict") return;
    setStep({ kind: "replace", combo: step.combo, conflicts: step.conflicts, replacements: {} });
  }

  async function handleConfirmReplace() {
    if (step.kind !== "replace") return;

    // This exact swap might already be a saved combo — most likely because
    // it (or an earlier force-assign) already created it — in which case
    // just assign that one directly instead of saving a duplicate.
    const existing = findExistingReplacementCombo(step.combo, step.replacements, availableCombos);
    if (existing) {
      onAssign(existing);
      return;
    }

    setCreating(true);
    setError(null);
    const name = `${step.combo.name} (Custom)`;
    const input = buildReplacementComboInput(step.combo, step.replacements, name);
    const result = await createComboAndFetch(input);
    setCreating(false);
    if (result.status === "error" || !result.combo) {
      setError(result.message ?? "Something went wrong.");
      return;
    }
    onAssign(result.combo);
  }

  const takenIds = takenPartIds(otherSlotCombos);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        {step.kind === "pick" ? (
          <>
            <DialogHeader>
              <DialogTitle>Assign a Combo</DialogTitle>
              <DialogDescription>Pick one of your saved combos for this slot.</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 space-y-2 overflow-y-auto px-6 pb-6">
              {availableCombos.length > 0 ? (
                availableCombos.map((combo) => {
                  const alreadyInDeck = usedComboIds.has(combo.id);
                  return (
                    <button
                      key={combo.id}
                      type="button"
                      disabled={pending || alreadyInDeck}
                      onClick={() => handlePick(combo)}
                      className="flex w-full items-center gap-3 border border-outline-variant/25 p-3 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ComboThumbnails bladeParts={combo.bladeParts} ratchet={combo.ratchet} bit={combo.bit} size="sm" fit="contain" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-on-surface">{combo.name}</p>
                        <ComboPartsLine bladeDisplay={combo.bladeDisplay} ratchet={combo.ratchet} bit={combo.bit} />
                      </div>
                      {alreadyInDeck ? <span className="label-mono shrink-0 text-[9px] text-on-surface/30">In Deck</span> : null}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <Swords className="h-6 w-6 text-on-surface/30" aria-hidden="true" />
                  <p className="text-sm text-on-surface/60">You don&apos;t have any combos saved yet.</p>
                  <Button asChild size="sm" className="gap-1.5" tooltip="Create a combo to assign here">
                    <Link href="/account/beyblade/combos/new">
                      <Plus className="h-3.5 w-3.5" /> Add Beyblade Combo
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : null}

        {step.kind === "conflict" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" /> Parts Already In This Deck
              </DialogTitle>
              <DialogDescription>
                {step.combo.name} shares parts with combos already in this deck — you only own one of each.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 px-6 pb-6">
              <ul className="space-y-1.5 text-sm">
                {step.conflicts.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-on-surface/70">
                    <PartThumbnail part={c.part} size="sm" fit="contain" />
                    <span>
                      <span className="font-medium text-on-surface">
                        {COMBO_PART_ROLE_LABELS[c.role]}: {c.part.shortName}
                      </span>{" "}
                      — used by {c.conflictsWithComboName}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-on-surface/50">
                Forcing this will save a custom copy of {step.combo.name} with a replacement for each conflicting part.
              </p>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" tooltip="Pick a different combo instead" onClick={() => setStep({ kind: "pick" })}>
                  Back
                </Button>
                <Button type="button" variant="destructive" className="flex-1" tooltip="Assign anyway and pick replacements" onClick={handleForce}>
                  Force Assign
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {step.kind === "replace" ? (
          <>
            <DialogHeader>
              <DialogTitle>Pick Replacements</DialogTitle>
              <DialogDescription>Choose a different part for each one already used elsewhere in this deck.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 px-6 pb-6">
              {uniqueConflicts(step.conflicts).map((c) => {
                const options: ComboboxOption[] = pickerListForRole(c.role, pickerOptions)
                  .filter((p) => !takenIds.has(p.id))
                  .map((p) => ({ value: p.id, label: replacementLabel(c.role, p), imageUrl: p.imageUrl }));
                const selectedId = step.replacements[c.role] ?? "";
                const selected = selectedId ? pickerListForRole(c.role, pickerOptions).find((p) => p.id === selectedId) : undefined;
                return (
                  <div key={c.role}>
                    <p className="mb-1.5 text-xs text-on-surface/60">
                      Replace {COMBO_PART_ROLE_LABELS[c.role]} <span className="text-on-surface/40">({c.part.shortName})</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <Combobox
                        className="flex-1"
                        label={COMBO_PART_ROLE_LABELS[c.role]}
                        hideLabel
                        placeholder="Select a replacement"
                        value={selectedId}
                        onValueChange={(value) =>
                          setStep((prev) => (prev.kind === "replace" ? { ...prev, replacements: { ...prev.replacements, [c.role]: value } } : prev))
                        }
                        options={options}
                      />
                      {selected ? <PartThumbnail part={selected} size="sm" fit="contain" /> : null}
                    </div>
                  </div>
                );
              })}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" tooltip="Go back" disabled={creating} onClick={() => setStep({ kind: "conflict", combo: step.combo, conflicts: step.conflicts })}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  tooltip="Save this as a custom combo and assign it"
                  disabled={creating || uniqueConflicts(step.conflicts).some((c) => !step.replacements[c.role])}
                  onClick={handleConfirmReplace}
                >
                  {creating ? "Saving..." : "Confirm"}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function uniqueConflicts(conflicts: ComboConflict[]): ComboConflict[] {
  return [...new Map(conflicts.map((c) => [c.role, c])).values()];
}

function replacementLabel(role: ComboPartRole, part: ComboPartOption): string {
  if (role === "blade") return part.name;
  if (role === "bit") return `${part.name} (${part.shortName})`;
  return part.shortName;
}
