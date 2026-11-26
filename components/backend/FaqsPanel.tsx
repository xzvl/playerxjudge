"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/dashboard/erp";
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
        <div className="space-y-4 px-5 pb-1">
          <FormField label="Question" required>
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </FormField>
          <FormField label="Answer" required>
            <Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Category" hint="Groups FAQs on the public page.">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="General" />
            </FormField>
            <FormField label="Sort Order" hint="Lower numbers appear first.">
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
            </FormField>
          </div>
          <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm text-on-surface/70">
            <Checkbox checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Published
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} aria-busy={pending} onClick={() => onSave(form)}>
            {pending ? "Saving…" : "Save FAQ"}
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" tooltip="Add a new FAQ" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New FAQ
        </Button>
      </div>

      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((item) => (
            <div key={item.id} className="rounded-[3px] border border-outline-variant/25 bg-surface-container-low p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-on-surface">{item.question}</p>
                    <StatusBadge tone={item.isPublished ? "success" : "neutral"}>{item.isPublished ? "Published" : "Draft"}</StatusBadge>
                    {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-on-surface/60">{item.answer}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
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
        <EmptyState
          title="No FAQs yet"
          description="Add the questions players ask most often."
          action={
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5" /> New FAQ
            </Button>
          }
        />
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

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this FAQ?"
        description={deleting?.question}
        confirmLabel="Delete FAQ"
        pendingLabel="Deleting…"
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
