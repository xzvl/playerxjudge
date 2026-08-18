"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Plus, Swords, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ComboPartsLine, ComboStatBars, ComboThumbnails } from "@/components/dashboard/beyblade/combo-ui";
import { deleteCombo } from "@/app/account/beyblade/actions";
import { computeComboStats } from "@/lib/beyblades/combo-stats";
import type { ComboWithParts } from "@/app/account/beyblade/data";

export function CombosPanel({ combos }: { combos: ComboWithParts[] }) {
  const [rows, setRows] = useState(combos);
  const [deleting, setDeleting] = useState<ComboWithParts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCombo(deleting.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    });
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button asChild className="gap-1.5" tooltip="Save a new Beyblade combo">
          <Link href="/account/beyblade/combos/new">
            <Plus className="h-3.5 w-3.5" /> Add Beyblade Combo
          </Link>
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((combo) => {
            const stats = computeComboStats([combo.blade, combo.ratchet, combo.bit]);
            return (
              <Card key={combo.id}>
                <CardContent className="p-5">
                  <ComboThumbnails bladeParts={combo.bladeParts} ratchet={combo.ratchet} bit={combo.bit} fit="contain" />
                  <p className="mt-3 heading truncate text-on-surface">{combo.name}</p>
                  <ComboPartsLine bladeDisplay={combo.bladeDisplay} ratchet={combo.ratchet} bit={combo.bit} />

                  <div className="mt-3">
                    <ComboStatBars stats={stats} />
                  </div>

                  <div className="my-4 border-t border-outline-variant/20" />

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" asChild tooltip="Edit this combo">
                      <Link href={`/account/beyblade/combos/${combo.id}`} aria-label={`Edit ${combo.name}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      tooltip="Remove this combo"
                      aria-label={`Remove ${combo.name}`}
                      disabled={pending}
                      onClick={() => setDeleting(combo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Swords className="h-8 w-8 text-on-surface/30" aria-hidden="true" />
            <p className="text-sm text-on-surface/60">No combos saved yet.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>This removes the combo from your saved list and any deck slot it&apos;s in.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Permanently remove this combo" disabled={pending} onClick={handleDelete}>
              {pending ? "Removing..." : "Remove Combo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
