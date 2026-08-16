"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFaq, deleteFaq, togglePublishFaq, updateFaq, type FaqInput } from "@/app/backend/faqs/actions";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isPublished: boolean;
}

const EMPTY_FORM: FaqInput = { question: "", answer: "", category: "", sortOrder: 0, isPublished: true };

function FaqDialog({
  open,
  onOpenChange,
  initial,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FaqInput;
  pending: boolean;
  onSave: (input: FaqInput) => void;
}) {
  const [form, setForm] = useState<FaqInput>(initial);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setForm(initial);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial.question ? "Edit FAQ" : "New FAQ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Question</label>
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Answer</label>
            <Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Category</label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="General" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Sort Order</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface/70">
            <Checkbox checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Published
          </label>
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" tooltip="Save this FAQ" disabled={pending} onClick={() => onSave(form)}>
            {pending ? "Saving..." : "Save FAQ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FaqsPanel({ faqs }: { faqs: FaqItem[] }) {
  const [rows, setRows] = useState(faqs);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState<FaqItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(input: FaqInput) {
    setError(null);
    startTransition(async () => {
      const result = await createFaq(input);
      if (result.status === "error" || !result.id) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => [
        ...prev,
        { id: result.id!, question: input.question, answer: input.answer, category: input.category || null, sortOrder: input.sortOrder, isPublished: input.isPublished },
      ]);
      setCreating(false);
    });
  }

  function handleUpdate(input: FaqInput) {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await updateFaq(editing.id, input);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === editing.id ? { ...r, question: input.question, answer: input.answer, category: input.category || null, sortOrder: input.sortOrder, isPublished: input.isPublished } : r))
      );
      setEditing(null);
    });
  }

  function handleTogglePublish(item: FaqItem) {
    setError(null);
    startTransition(async () => {
      const result = await togglePublishFaq(item.id, !item.isPublished);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, isPublished: !item.isPublished } : r)));
    });
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteFaq(deleting.id);
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
        <Button size="sm" className="gap-1.5" tooltip="Add a new FAQ" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New FAQ
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="border border-outline-variant/25 bg-surface-container-low p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-on-surface">{item.question}</p>
                    <Badge variant={item.isPublished ? "success" : "outline"}>{item.isPublished ? "Published" : "Draft"}</Badge>
                    {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-on-surface/60">{item.answer}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" tooltip={item.isPublished ? "Unpublish this FAQ" : "Publish this FAQ"} disabled={pending} onClick={() => handleTogglePublish(item)}>
                    {item.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                  <Button variant="ghost" size="icon" tooltip="Edit this FAQ" aria-label={`Edit ${item.question}`} disabled={pending} onClick={() => setEditing(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" tooltip="Delete this FAQ" aria-label={`Delete ${item.question}`} disabled={pending} onClick={() => setDeleting(item)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No FAQs yet.
        </p>
      )}

      <FaqDialog open={creating} onOpenChange={setCreating} initial={EMPTY_FORM} pending={pending} onSave={handleCreate} />
      {editing ? (
        <FaqDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          initial={{ question: editing.question, answer: editing.answer, category: editing.category ?? "", sortOrder: editing.sortOrder, isPublished: editing.isPublished }}
          pending={pending}
          onSave={handleUpdate}
        />
      ) : null}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this FAQ?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Permanently delete this FAQ" disabled={pending} onClick={handleDelete}>
              {pending ? "Deleting..." : "Delete FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
