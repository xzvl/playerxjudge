"use client";

import { useState, useTransition } from "react";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createVariation,
  deleteVariation,
  saveVariationOrder,
  updateVariation,
  uploadVariationImage,
} from "@/app/backend/beyblades/variation-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableList } from "@/components/ui/sortable-list";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import type { BeybladeVariation } from "@/lib/types/database";

type Editing = { mode: "new" } | { mode: "edit"; variation: BeybladeVariation };

// Variations of one catalog part: name, where it came from, and an image.
// Lives on the part's edit page (/backend/beyblades/[id]). Drag to reorder.
export function BeybladeVariationsPanel({
  beybladeId,
  initialVariations,
}: {
  beybladeId: string;
  initialVariations: BeybladeVariation[];
}) {
  const [variations, setVariations] = useState(initialVariations);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<BeybladeVariation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upsert(variation: BeybladeVariation) {
    setVariations((prev) =>
      prev.some((v) => v.id === variation.id) ? prev.map((v) => (v.id === variation.id ? variation : v)) : [...prev, variation]
    );
  }

  function reorder(next: BeybladeVariation[]) {
    const previous = variations;
    setVariations(next);
    setError(null);
    startTransition(async () => {
      const result = await saveVariationOrder(
        beybladeId,
        next.map((v) => v.id)
      );
      if (result.status === "error") {
        setVariations(previous);
        setError(result.message ?? "Couldn't save the new order.");
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setError(null);
    startTransition(async () => {
      const result = await deleteVariation(target.id);
      if (result.status === "error") {
        setError(result.message ?? "Couldn't delete the variation.");
        return;
      }
      setVariations((prev) => prev.filter((v) => v.id !== target.id));
      setDeleting(null);
    });
  }

  return (
    <section className="rounded-lg border border-outline-variant/25 bg-surface-container-low">
      <header className="flex min-h-10 items-center justify-between gap-3 border-b border-outline-variant/20 px-4 py-2">
        <h2 className="text-[13px] font-medium">
          Variations <span className="ml-1 text-xs font-normal text-on-surface/45">{variations.length}</span>
        </h2>
        <Button type="button" size="sm" onClick={() => setEditing({ mode: "new" })}>
          <Plus /> Add variation
        </Button>
      </header>

      <div className="p-4">
        {error ? <p className="mb-3 text-[13px] text-destructive">{error}</p> : null}
        {variations.length === 0 ? (
          <p className="rounded-md border border-dashed border-outline-variant/30 p-6 text-center text-[13px] text-on-surface/50">
            No variations yet. Add colorways, editions or promo releases of this part.
          </p>
        ) : (
          <SortableList
            items={variations}
            getKey={(v) => v.id}
            onReorder={reorder}
            renderItem={(v) => (
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline-variant/25 bg-surface-container-lowest">
                  {v.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.image_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-on-surface/30" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{v.name}</p>
                  <p className="truncate text-xs text-on-surface/50">{v.source ? `From ${v.source}` : "Source not set"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${v.name}`}
                    onClick={() => setEditing({ mode: "edit", variation: v })}
                  >
                    <Pencil />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${v.name}`} onClick={() => setDeleting(v)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            )}
          />
        )}
      </div>

      {editing ? (
        <VariationDialog
          key={editing.mode === "edit" ? editing.variation.id : "new"}
          beybladeId={beybladeId}
          editing={editing}
          onSaved={upsert}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !pending && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>This removes the variation and its image. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function VariationDialog({
  beybladeId,
  editing,
  onSaved,
  onClose,
}: {
  beybladeId: string;
  editing: Editing;
  onSaved: (variation: BeybladeVariation) => void;
  onClose: () => void;
}) {
  const existing = editing.mode === "edit" ? editing.variation : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [source, setSource] = useState(existing?.source ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = existing
        ? await updateVariation(existing.id, { name, source })
        : await createVariation(beybladeId, { name, source });
      if (result.status === "error" || !result.variation) {
        setError(result.message ?? "Couldn't save the variation.");
        return;
      }
      let saved = result.variation;
      if (imageFile) {
        const formData = new FormData();
        formData.set("file", imageFile);
        const upload = await uploadVariationImage(saved.id, formData);
        if (upload.status === "error" || !upload.variation) {
          onSaved(saved);
          setError(`Saved, but the image didn't upload: ${upload.message ?? "unknown error"}`);
          return;
        }
        saved = upload.variation;
      }
      onSaved(saved);
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit variation" : "Add variation"}</DialogTitle>
          <DialogDescription>A colorway, edition or promo release of this part.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="variation-name">Name</Label>
            <Input
              id="variation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Metallic Coat: Gold"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="variation-source">Came from</Label>
            <Input
              id="variation-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. UX-00 Random Booster Vol. 3"
              maxLength={200}
            />
          </div>
          <ThumbnailUploadField
            label="Image"
            aspectClassName="aspect-square w-full max-w-[180px]"
            maxDimension={1000}
            initialUrl={existing?.image_url ?? null}
            onFileReady={(file) => setImageFile(file)}
            preserveAspectRatio
          />
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : existing ? "Save changes" : "Add variation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
