"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, GripVertical, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComboPartsLine, ComboThumbnails } from "@/components/dashboard/beyblade/combo-ui";
import { setDeckSlot } from "@/app/account/beyblade/actions";
import { cn } from "@/lib/utils";
import type { ComboWithParts } from "@/app/account/beyblade/data";

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
}: {
  deckId: string;
  deckName: string;
  // Always length 3, in slot order — null for an empty slot.
  combos: (ComboWithParts | null)[];
}) {
  const [current, setCurrent] = useState(combos);
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

  return (
    <section id="current-deck" className="scroll-mt-20">
      <h2 className="label-mono flex items-center gap-2 text-primary">
        <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Current Deck
      </h2>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-outline-variant/25 bg-surface-container-low p-4">
        <p className="heading text-lg">{deckName}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild tooltip="Choose a different deck">
            <Link href="/account/beyblade/deck">Change</Link>
          </Button>
          <Button variant="outline" size="sm" asChild tooltip="Edit this deck's combos">
            <Link href={`/account/beyblade/deck/${deckId}`}>Customize</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-on-surface/50">Drag a combo onto another to reorder who goes 1st, 2nd, and 3rd.</p>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {current.map((combo, i) => {
          const slot = (i + 1) as Slot;
          const isDragging = draggedSlot === slot;
          const isDragOver = dragOverSlot === slot;
          return (
            <Card
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
              className={cn("cursor-grab transition-colors active:cursor-grabbing", isDragging && "opacity-40", isDragOver && !isDragging && "border-primary")}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="label-mono text-primary">{POSITION_LABELS[i]}</span>
                  <GripVertical className="h-4 w-4 text-on-surface/30" aria-hidden="true" />
                </div>
                {combo ? (
                  <>
                    <div className="mt-2">
                      <ComboThumbnails bladeParts={combo.bladeParts} ratchet={combo.ratchet} bit={combo.bit} size="sm" bladeSize="lg" fit="contain" />
                    </div>
                    <p className="mt-3 heading truncate text-on-surface">{combo.name}</p>
                    <ComboPartsLine bladeDisplay={combo.bladeDisplay} ratchet={combo.ratchet} bit={combo.bit} />
                  </>
                ) : (
                  <p className="mt-4 text-sm text-on-surface/30">— Empty —</p>
                )}
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    tooltip={`Move ${POSITION_LABELS[i]} up`}
                    aria-label={`Move ${POSITION_LABELS[i]} up`}
                    disabled={pending || slot === 1}
                    onClick={() => swap(slot, (slot - 1) as Slot)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    tooltip={`Move ${POSITION_LABELS[i]} down`}
                    aria-label={`Move ${POSITION_LABELS[i]} down`}
                    disabled={pending || slot === 3}
                    onClick={() => swap(slot, (slot + 1) as Slot)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
