"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AssignComboDialog } from "@/components/dashboard/beyblade/AssignComboDialog";
import { DeckSlotCard, EMPTY_COMBO_MATCH_STATS } from "@/components/dashboard/beyblade/combo-ui";
import { renameDeck, setActiveDeck, setDeckSlot } from "@/app/account/beyblade/actions";
import { cn } from "@/lib/utils";
import type { ComboMatchStats, ComboPickerOptions, ComboWithParts } from "@/app/account/beyblade/data";
import type { BeybladeDeck } from "@/lib/types/database";

type Slot = 1 | 2 | 3;

export interface DeckSummary {
  deck: BeybladeDeck;
  // Always length 3, in slot order — null for an empty slot.
  combos: (ComboWithParts | null)[];
}

interface DeckRowState {
  id: string;
  name: string;
  combos: (ComboWithParts | null)[];
}

// Every deck at once, each as its own row: [name/select/customize card] +
// [its 3 combo slots] — one flat 4-column grid per deck rather than N
// separate DeckSlots instances, since "Select Deck" needs to know about
// every other deck's active state (only one can be active — see
// setActiveDeck) and every deck's slots need to stay independently
// editable right here, not just on /account/beyblade/deck/[id]. The active
// deck's row always renders first, live-reordering the moment a different
// deck is selected — not just on initial load.
export function DeckRows({
  decks,
  availableCombos,
  pickerOptions,
  comboStats,
}: {
  decks: DeckSummary[];
  availableCombos: ComboWithParts[];
  pickerOptions: ComboPickerOptions;
  // Real per-combo W-L record, keyed by combo id — see
  // getComboMatchStatsForProfile. A combo with no recorded battles has no
  // entry; DeckSlotCard falls back to EMPTY_COMBO_MATCH_STATS.
  comboStats: Map<string, ComboMatchStats>;
}) {
  const [rows, setRows] = useState<DeckRowState[]>(() => decks.map(({ deck, combos }) => ({ id: deck.id, name: deck.name, combos })));
  const [activeId, setActiveId] = useState(() => decks.find((d) => d.deck.is_active)?.deck.id ?? decks[0]?.deck.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [picker, setPicker] = useState<{ deckId: string; slot: Slot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const orderedRows = useMemo(() => {
    const active = rows.find((r) => r.id === activeId);
    if (!active) return rows;
    return [active, ...rows.filter((r) => r.id !== activeId)];
  }, [rows, activeId]);

  function handleSelect(deckId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setActiveDeck(deckId);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setActiveId(deckId);
    });
  }

  function handleRenameSave(deckId: string) {
    const trimmed = nameDraft.trim();
    setError(null);
    startTransition(async () => {
      const result = await renameDeck(deckId, trimmed);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === deckId ? { ...r, name: trimmed } : r)));
      setEditingId(null);
    });
  }

  function handleAssign(deckId: string, slot: Slot, combo: ComboWithParts | null) {
    setError(null);
    startTransition(async () => {
      const result = await setDeckSlot(deckId, slot, combo?.id ?? null);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === deckId ? { ...r, combos: r.combos.map((c, i) => (i === slot - 1 ? combo : c)) } : r)));
      setPicker(null);
    });
  }

  const pickerRow = picker ? rows.find((r) => r.id === picker.deckId) : undefined;
  const pickerUsedComboIds = new Set((pickerRow?.combos.filter((c): c is ComboWithParts => c !== null) ?? []).map((c) => c.id));
  const pickerOtherSlotCombos = picker && pickerRow ? pickerRow.combos.filter((_, i) => i !== picker.slot - 1) : [];

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-8">
        {orderedRows.map((row) => {
          const isActive = row.id === activeId;
          const isEditing = editingId === row.id;
          return (
            <div key={row.id} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className={cn(isActive && "border-primary/60")}>
                <CardContent className="p-5">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        maxLength={60}
                        autoFocus
                        aria-label="Deck name"
                        className="h-9"
                      />
                      <Button size="icon" variant="outline" tooltip="Save name" disabled={pending} onClick={() => handleRenameSave(row.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" tooltip="Cancel" disabled={pending} onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="heading truncate text-lg">{row.name}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        tooltip="Rename this deck"
                        aria-label={`Rename ${row.name}`}
                        onClick={() => {
                          setEditingId(row.id);
                          setNameDraft(row.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  <ul className="mt-3 space-y-1 text-sm text-on-surface/60">
                    {row.combos.map((combo, i) => (
                      <li key={i} className="truncate">
                        {combo ? combo.name : <span className="text-on-surface/30">— Empty —</span>}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant={isActive ? "secondary" : "outline"}
                      size="sm"
                      className="gap-1.5 w-full"
                      disabled={isActive || pending}
                      tooltip={isActive ? "This is your active deck" : `Make ${row.name} your active deck`}
                      onClick={() => handleSelect(row.id)}
                    >
                      {isActive ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Selected
                        </>
                      ) : (
                        "Select Deck"
                      )}
                    </Button>
                    <Button variant="destructive" size="sm" asChild tooltip={`Customize ${row.name}`}>
                      <Link href={`/account/beyblade/deck/${row.id}`}>Customize Deck</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {row.combos.map((combo, i) => {
                const slot = (i + 1) as Slot;
                return (
                  <DeckSlotCard
                    key={slot}
                    combo={combo}
                    stats={(combo && comboStats.get(combo.id)) || EMPTY_COMBO_MATCH_STATS}
                    pending={pending}
                    onChange={() => setPicker({ deckId: row.id, slot })}
                    onClear={() => handleAssign(row.id, slot, null)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <AssignComboDialog
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        availableCombos={availableCombos}
        usedComboIds={pickerUsedComboIds}
        otherSlotCombos={pickerOtherSlotCombos}
        pickerOptions={pickerOptions}
        pending={pending}
        onAssign={(combo) => picker && handleAssign(picker.deckId, picker.slot, combo)}
      />
    </div>
  );
}
