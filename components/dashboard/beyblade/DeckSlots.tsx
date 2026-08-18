"use client";

import { useState, useTransition } from "react";

import { AssignComboDialog } from "@/components/dashboard/beyblade/AssignComboDialog";
import { DeckSlotCard, EMPTY_COMBO_MATCH_STATS } from "@/components/dashboard/beyblade/combo-ui";
import { setDeckSlot } from "@/app/account/beyblade/actions";
import type { ComboMatchStats, ComboPickerOptions, ComboWithParts } from "@/app/account/beyblade/data";

type Slot = 1 | 2 | 3;

// A single deck's 3 slots, editable — used standalone on
// /account/beyblade/deck/[id]. The main Build Your Deck page instead uses
// DeckRows, which needs the same slot-editing behavior across every deck
// at once (see its own comment for why that isn't just N of these).
export function DeckSlots({
  deckId,
  slots,
  availableCombos,
  pickerOptions,
  comboStats,
}: {
  deckId: string;
  // Always length 3, in slot order — null for an empty slot.
  slots: (ComboWithParts | null)[];
  availableCombos: ComboWithParts[];
  pickerOptions: ComboPickerOptions;
  // Real per-combo W-L record, keyed by combo id — see
  // getComboMatchStatsForProfile.
  comboStats: Map<string, ComboMatchStats>;
}) {
  const [current, setCurrent] = useState(slots);
  const [pickerSlot, setPickerSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function assign(slot: Slot, combo: ComboWithParts | null) {
    setError(null);
    startTransition(async () => {
      const result = await setDeckSlot(deckId, slot, combo?.id ?? null);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setCurrent((prev) => prev.map((c, i) => (i === slot - 1 ? combo : c)));
      setPickerSlot(null);
    });
  }

  const usedComboIds = new Set(current.filter((c): c is ComboWithParts => c !== null).map((c) => c.id));
  const pickerOtherSlotCombos = pickerSlot !== null ? current.filter((_, i) => i !== pickerSlot - 1) : [];

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {current.map((combo, i) => {
          const slot = (i + 1) as Slot;
          return (
            <DeckSlotCard
              key={slot}
              combo={combo}
              stats={(combo && comboStats.get(combo.id)) || EMPTY_COMBO_MATCH_STATS}
              pending={pending}
              onChange={() => setPickerSlot(slot)}
              onClear={() => assign(slot, null)}
            />
          );
        })}
      </div>

      <AssignComboDialog
        open={pickerSlot !== null}
        onOpenChange={(open) => !open && setPickerSlot(null)}
        availableCombos={availableCombos}
        usedComboIds={usedComboIds}
        otherSlotCombos={pickerOtherSlotCombos}
        pickerOptions={pickerOptions}
        pending={pending}
        onAssign={(combo) => pickerSlot && assign(pickerSlot, combo)}
      />
    </div>
  );
}
