"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, GripVertical, Layers, Pencil, Plus, Repeat } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ComboPartsLine, ComboThumbnails, EMPTY_COMBO_MATCH_STATS } from "@/components/dashboard/beyblade/combo-ui";
import { DeckSlots } from "@/components/dashboard/beyblade/DeckSlots";
import type { DeckSummary } from "@/components/dashboard/beyblade/DeckRows";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setDeckSlot } from "@/app/account/beyblade/actions";
import { setTournamentDeck } from "@/app/tournaments/[slug]/player/actions";
import { cn } from "@/lib/utils";
import type { ComboMatchStats, ComboPickerOptions, ComboWithParts } from "@/app/account/beyblade/data";
import { BlurLoadingOverlay } from "@/components/tournaments/player/BlurLoadingOverlay";

type Slot = 1 | 2 | 3;
const POSITION_LABELS = ["1st", "2nd", "3rd"] as const;

// Only shown when the signed-in viewer is looking at their own approved-
// linked participant (see TournamentPlayerPage) — this is *the* deck
// (slot_1/2/3 on beyblade_decks), the same one /account/beyblade/deck
// manages, not a tournament-scoped copy. Reordering here (drag or the
// up/down buttons — native HTML5 drag isn't touch-friendly, so the buttons
// are the only way to reorder on mobile) calls the same setDeckSlot action
// that page uses, so it's reflected there too.
export function CurrentDeckSection({
  deckId,
  deckName,
  combos,
  decks,
  availableCombos,
  pickerOptions,
  comboStats,
  tournamentId,
  slug,
  hasTournamentDeck,
}: {
  tournamentId: string;
  slug: string;
  // True when the player picked a deck for this tournament; false means their
  // default active deck is being used.
  hasTournamentDeck: boolean;
  deckId: string;
  deckName: string;
  // Always length 3, in slot order — null for an empty slot.
  combos: (ComboWithParts | null)[];
  // For the Change / Customize popups (no trip to /account/beyblade/deck).
  decks: DeckSummary[];
  availableCombos: ComboWithParts[];
  pickerOptions: ComboPickerOptions;
  comboStats: Map<string, ComboMatchStats>;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(combos);
  const [changeOpen, setChangeOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // A router.refresh() after a popup edit or deck switch brings fresh props.
  useEffect(() => setCurrent(combos), [combos]);
  const [draggedSlot, setDraggedSlot] = useState<Slot | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function swap(a: Slot, b: Slot) {
    if (a === b) return;
    const comboA = current[a - 1];
    const comboB = current[b - 1];
    setError(null);
    startTransition(async () => {
      const [resultA, resultB] = await Promise.all([setDeckSlot(deckId, a, comboB?.id ?? null), setDeckSlot(deckId, b, comboA?.id ?? null)]);
      if (resultA.status === "error" || resultB.status === "error") {
        setError(resultA.message ?? resultB.message ?? "Something went wrong.");
        return;
      }
      setCurrent((prev) => {
        const next = [...prev];
        next[a - 1] = comboB;
        next[b - 1] = comboA;
        return next;
      });
    });
  }

  const filled = current.filter(Boolean).length;
  const total = current.reduce(
    (acc, c) => {
      const st = c ? comboStats.get(c.id) : undefined;
      return { wins: acc.wins + (st?.wins ?? 0), losses: acc.losses + (st?.losses ?? 0), draws: acc.draws + (st?.draws ?? 0) };
    },
    { wins: 0, losses: 0, draws: 0 }
  );

  return (
    <section id="current-deck" className="scroll-mt-20">
      <BlurLoadingOverlay show={pending} label="Updating deck…" />
      <h2 className="label-mono flex items-center gap-2 text-primary">
        <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Current Deck
      </h2>

      <div className="mt-4 overflow-hidden border border-outline-variant/25 bg-surface-container-low">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 p-4">
          <div className="min-w-0">
            <p className="label-mono text-[10px] text-on-surface/45">
              Active deck for this tournament{hasTournamentDeck ? "" : " · default"}
            </p>
            <p className="heading truncate text-xl">{deckName}</p>
            <p className="mt-0.5 text-xs text-on-surface/55">
              {filled}/3 combos
              {total.wins + total.losses + total.draws > 0 ? ` · ${total.wins}-${total.losses}-${total.draws} combined W-L-T` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" tooltip="Choose a different deck" onClick={() => setChangeOpen(true)}>
              <Repeat className="h-3.5 w-3.5" /> Change
            </Button>
            <Button size="sm" className="gap-1.5" tooltip="Edit this deck's combos" onClick={() => setCustomizeOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Customize
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="p-4">
          <p className="mb-3 text-xs text-on-surface/50">Battle order — drag a combo onto another, or use the arrows, to change who goes 1st, 2nd and 3rd.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {current.map((combo, i) => {
              const slot = (i + 1) as Slot;
              const isDragging = draggedSlot === slot;
              const isDragOver = dragOverSlot === slot;
              const st = (combo && comboStats.get(combo.id)) || EMPTY_COMBO_MATCH_STATS;
              return (
                <div
                  key={slot}
                  draggable={!pending}
                  onDragStart={() => setDraggedSlot(slot)}
                  onDragEnd={() => {
                    setDraggedSlot(null);
                    setDragOverSlot(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlot(slot);
                  }}
                  onDragLeave={() => setDragOverSlot((prev) => (prev === slot ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedSlot !== null) swap(draggedSlot, slot);
                    setDraggedSlot(null);
                    setDragOverSlot(null);
                  }}
                  className={cn(
                    "flex min-w-0 cursor-grab flex-col border border-outline-variant/25 bg-surface transition-colors active:cursor-grabbing",
                    isDragging && "opacity-40",
                    isDragOver && !isDragging && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-outline-variant/15 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-on-surface/30" aria-hidden="true" />
                      <span className="flex h-6 min-w-6 items-center justify-center bg-primary px-1.5 text-[11px] font-bold text-white">
                        {POSITION_LABELS[i]}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        tooltip={`Move ${POSITION_LABELS[i]} earlier`}
                        aria-label={`Move ${POSITION_LABELS[i]} earlier`}
                        disabled={pending || slot === 1}
                        onClick={() => swap(slot, (slot - 1) as Slot)}
                      >
                        <ArrowUp className="h-3.5 w-3.5 sm:hidden" />
                        <ArrowLeft className="hidden h-3.5 w-3.5 sm:block" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        tooltip={`Move ${POSITION_LABELS[i]} later`}
                        aria-label={`Move ${POSITION_LABELS[i]} later`}
                        disabled={pending || slot === 3}
                        onClick={() => swap(slot, (slot + 1) as Slot)}
                      >
                        <ArrowDown className="h-3.5 w-3.5 sm:hidden" />
                        <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
                      </Button>
                    </span>
                  </div>
                  {combo ? (
                    <div className="flex flex-1 flex-col gap-3 p-3">
                      <ComboThumbnails bladeParts={combo.bladeParts} ratchet={combo.ratchet} bit={combo.bit} size="sm" bladeSize="lg" fit="contain" />
                      <div className="min-w-0">
                        <p className="heading truncate text-on-surface">{combo.name}</p>
                        <ComboPartsLine bladeDisplay={combo.bladeDisplay} ratchet={combo.ratchet} bit={combo.bit} />
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-outline-variant/15 pt-2 text-xs tabular-nums text-on-surface/60">
                        <span>
                          {st.wins}-{st.losses}-{st.draws} <span className="text-on-surface/40">W-L-T</span>
                        </span>
                        <span className="font-medium text-on-surface">{st.matches > 0 ? `${st.winRate}%` : "—"}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCustomizeOpen(true)}
                      className="m-3 flex min-h-32 flex-1 flex-col items-center justify-center gap-1.5 border border-dashed border-outline-variant/40 text-on-surface/40 transition-colors hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-5 w-5" aria-hidden="true" />
                      <span className="label-mono text-[10px]">Assign combo</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ChangeDeckDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        decks={decks}
        activeId={deckId}
        tournamentId={tournamentId}
        slug={slug}
        hasTournamentDeck={hasTournamentDeck}
        onChanged={() => router.refresh()}
      />

      <Dialog
        open={customizeOpen}
        onOpenChange={(next) => {
          setCustomizeOpen(next);
          // Pull the saved slots back into the page when the popup closes.
          if (!next) router.refresh();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Customize {deckName}</DialogTitle>
            <DialogDescription>Assign a combo to each of the 3 slots. Changes save as you go.</DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5">
            <DeckSlots deckId={deckId} slots={current} availableCombos={availableCombos} pickerOptions={pickerOptions} comboStats={comboStats} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ChangeDeckDialog({
  open,
  onOpenChange,
  decks,
  activeId,
  tournamentId,
  slug,
  hasTournamentDeck,
  onChanged,
}: {
  tournamentId: string;
  slug: string;
  hasTournamentDeck: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decks: DeckSummary[];
  activeId: string;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function select(id: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setTournamentDeck(tournamentId, id, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      onOpenChange(false);
      onChanged();
    });
  }

  return (
    <>
      <BlurLoadingOverlay show={pending} label="Changing deck…" />
      <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change deck for this tournament</DialogTitle>
            <DialogDescription>Pick the deck for this tournament only. Tournaments without a pick use your default deck. Create or rename decks from your Beyblade dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-5 pb-5">
            {error ? (
              <p role="alert" className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {hasTournamentDeck ? (
              <Button variant="outline" size="sm" className="w-full" disabled={pending} onClick={() => select(null)}>
                Use my default deck
              </Button>
            ) : null}
            {decks.map(({ deck, combos }) => {
              const isActive = deck.id === activeId;
              return (
                <button
                  key={deck.id}
                  type="button"
                  disabled={pending || isActive}
                  onClick={() => select(deck.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 border p-3 text-left transition-colors",
                    isActive ? "border-primary/60 bg-primary/5" : "border-outline-variant/25 hover:border-primary/50 hover:bg-surface-container"
                  )}
                >
                  <span className="min-w-0">
                    <span className="heading block truncate">{deck.name}</span>
                    <span className="block truncate text-xs text-on-surface/55">
                      {combos.map((c) => c?.name ?? "Empty").join(" · ")}
                    </span>
                  </span>
                  {isActive ? (
                    <span className="label-mono flex shrink-0 items-center gap-1 text-[10px] text-primary">
                      <Check className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
