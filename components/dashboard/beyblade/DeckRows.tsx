"use client";

import { useMemo, useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AssignComboDialog } from "@/components/dashboard/beyblade/AssignComboDialog";
import { DeckSlotCard, EMPTY_COMBO_MATCH_STATS } from "@/components/dashboard/beyblade/combo-ui";
import { ConfirmActionButton } from "@/components/dashboard/team/ConfirmActionButton";
import { createDeck, deleteDeck, renameDeck, setActiveDeck, setDeckSlot } from "@/app/account/beyblade/actions";
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

// Every deck at once, one card per deck: a header (name, Active badge,
// set-active / rename / delete) over its 3 combo slots. Players can create
// as many decks as they like ("New deck"); only one is active at a time
// (see setActiveDeck), and the active deck always renders first. The page
// keys this component by the deck ids, so creating or deleting a deck
// (router.refresh) re-seeds the rows from the server.
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
  const router = useRouter();
  const [rows, setRows] = useState<DeckRowState[]>(() => decks.map(({ deck, combos }) => ({ id: deck.id, name: deck.name, combos })));
  const [activeId, setActiveId] = useState(() => decks.find((d) => d.deck.is_active)?.deck.id ?? decks[0]?.deck.id ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [picker, setPicker] = useState<{ deckId: string; slot: Slot } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useBusyTransition();

  const orderedRows = useMemo(() => {
    const active = rows.find((r) => r.id === activeId);
    if (!active) return rows;
    return [active, ...rows.filter((r) => r.id !== activeId)];
  }, [rows, activeId]);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createDeck();
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      router.refresh();
    });
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface/60">
          {rows.length} deck{rows.length === 1 ? "" : "s"} · each holds 3 combos. Your active deck is the one used in tournaments.
        </p>
        <Button size="sm" className="gap-1.5" disabled={pending} onClick={handleCreate}>
          <Plus className="h-3.5 w-3.5" /> New deck
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-5">
        {orderedRows.map((row) => {
          const isActive = row.id === activeId;
          const isEditing = editingId === row.id;
          const filled = row.combos.filter(Boolean).length;
          return (
            <Card key={row.id} className={cn("overflow-hidden", isActive && "border-primary/60")}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 bg-surface-container-low px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameSave(row.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        maxLength={60}
                        autoFocus
                        aria-label="Deck name"
                        className="h-9 max-w-xs"
                      />
                      <Button size="icon" variant="outline" tooltip="Save name" disabled={pending} onClick={() => handleRenameSave(row.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" tooltip="Cancel" disabled={pending} onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="heading min-w-0 truncate text-lg">{row.name}</h2>
                      {isActive ? <span className="label-mono shrink-0 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Active</span> : null}
                      <span className="shrink-0 text-xs text-on-surface/45">{filled}/3 combos</span>
                    </>
                  )}
                </div>
                {!isEditing ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!isActive ? (
                      <Button variant="outline" size="sm" disabled={pending} tooltip={`Make ${row.name} your active deck`} onClick={() => handleSelect(row.id)}>
                        Set active
                      </Button>
                    ) : null}
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
                    {rows.length > 1 ? (
                      <ConfirmActionButton
                        title={`Delete ${row.name}?`}
                        description={
                          isActive
                            ? "This is your active deck, so another deck becomes active. The combos themselves stay in your Combos list."
                            : "The combos themselves stay in your Combos list."
                        }
                        confirmLabel="Delete"
                        variant="ghost"
                        size="icon"
                        tooltip="Delete this deck"
                        aria-label={`Delete ${row.name}`}
                        onConfirm={async () => {
                          const r = await deleteDeck(row.id);
                          return r.status === "error" ? { status: "error", message: r.message } : { status: "success" };
                        }}
                        onDone={() => router.refresh()}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ConfirmActionButton>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
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
              </CardContent>
            </Card>
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
