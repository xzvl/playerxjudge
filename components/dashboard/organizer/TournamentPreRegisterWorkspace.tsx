"use client";

import { useState, useTransition } from "react";
import { Check, Copy, CreditCard, Eye, EyeOff, Pencil, Search, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime } from "@/lib/format";
import type { PreregistrationPaymentStatus, TournamentPreregistration } from "@/lib/types/database";
import {
  addPreRegisteredParticipant,
  removePreRegistration,
  updatePreRegistration,
  updatePreRegistrationPaymentStatus,
  updatePreRegistrationVisibility,
} from "@/app/account/organizer/tournament/[slug]/pre-register/actions";

const PAYMENT_STATUS_LABEL: Record<PreregistrationPaymentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
};

const PAYMENT_STATUS_CLASS: Record<PreregistrationPaymentStatus, string> = {
  pending: "text-on-surface/60",
  confirmed: "text-primary",
  failed: "text-destructive",
};

function EditPreRegistrationForm({
  entry,
  pending,
  onSubmit,
}: {
  entry: TournamentPreregistration;
  pending: boolean;
  onSubmit: (input: { fullName: string; bladerName: string; facebookName: string }) => void;
}) {
  const [fullName, setFullName] = useState(entry.full_name);
  const [bladerName, setBladerName] = useState(entry.blader_name);
  const [facebookName, setFacebookName] = useState(entry.facebook_name);

  return (
    <div className="space-y-4 px-6 pb-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface" htmlFor="edit-prereg-full-name">
          Full Name
        </label>
        <Input id="edit-prereg-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface" htmlFor="edit-prereg-blader-name">
          Blader Name
        </label>
        <Input id="edit-prereg-blader-name" value={bladerName} onChange={(e) => setBladerName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface" htmlFor="edit-prereg-facebook-name">
          Facebook Name
        </label>
        <Input id="edit-prereg-facebook-name" value={facebookName} onChange={(e) => setFacebookName(e.target.value)} />
      </div>
      <DialogFooter className="p-0 pt-2">
        <Button
          type="button"
          tooltip="Save these changes"
          disabled={pending || !fullName.trim() || !bladerName.trim() || !facebookName.trim()}
          onClick={() => onSubmit({ fullName: fullName.trim(), bladerName: bladerName.trim(), facebookName: facebookName.trim() })}
        >
          Save
        </Button>
      </DialogFooter>
    </div>
  );
}

export function TournamentPreRegisterWorkspace({
  tournamentId,
  slug,
  initialPreregistrations,
}: {
  tournamentId: string;
  slug: string;
  initialPreregistrations: TournamentPreregistration[];
}) {
  const [entries, setEntries] = useState(initialPreregistrations);
  const [query, setQuery] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<TournamentPreregistration | null>(null);
  const [removing, setRemoving] = useState<TournamentPreregistration | null>(null);

  const visible = entries.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.blader_name.toLowerCase().includes(q) ||
      e.facebook_name.toLowerCase().includes(q)
    );
  });

  function handleAdd(entry: TournamentPreregistration) {
    setError(null);
    startTransition(async () => {
      const result = await addPreRegisteredParticipant(tournamentId, slug, entry.blader_name);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setAddedIds((prev) => new Set(prev).add(entry.id));
    });
  }

  function handleEdit(input: { fullName: string; bladerName: string; facebookName: string }) {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await updatePreRegistration(editing.id, slug, input);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.preregistration) {
        const updated = result.preregistration;
        setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      }
      setEditing(null);
    });
  }

  function handleToggleVisibility(entry: TournamentPreregistration) {
    const nextHidePublic = !entry.hide_public;
    setError(null);
    startTransition(async () => {
      const result = await updatePreRegistrationVisibility(entry.id, slug, nextHidePublic);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, hide_public: nextHidePublic } : e)));
    });
  }

  function handlePaymentStatus(entry: TournamentPreregistration, paymentStatus: PreregistrationPaymentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updatePreRegistrationPaymentStatus(entry.id, slug, paymentStatus);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, payment_status: paymentStatus } : e)));
    });
  }

  function handleRemove() {
    if (!removing) return;
    const target = removing;
    setError(null);
    startTransition(async () => {
      const result = await removePreRegistration(target.id, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== target.id));
      setRemoving(null);
    });
  }

  async function handleCopyAll() {
    const text = entries.map((e) => e.blader_name).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard — your browser may have blocked it.");
    }
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/30" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pre-registrations..."
            className="pl-9"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          tooltip="Copy every blader name to your clipboard, one per line — paste it into Bulk Add on Participants"
          disabled={entries.length === 0}
          onClick={handleCopyAll}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy All"}
        </Button>
      </div>

      {visible.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Registered</th>
                <th className="p-4" scope="col">Full Name</th>
                <th className="p-4" scope="col">Blader Name</th>
                <th className="p-4" scope="col">Facebook Name</th>
                <th className="p-4" scope="col">Payment</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => {
                const added = addedIds.has(e.id);
                return (
                  <tr key={e.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap p-4 py-2 text-xs text-on-surface/50">
                      {formatDate(e.created_at)} · {formatTime(e.created_at)}
                    </td>
                    <td className="p-4 py-2 text-on-surface/80">{e.full_name}</td>
                    <td className="p-4 py-2 font-medium text-on-surface">
                      <span className="flex items-center gap-2">
                        {e.blader_name}
                        {e.hide_public ? (
                          <EyeOff className="h-3.5 w-3.5 shrink-0 text-on-surface/30" aria-label="Hidden on public" />
                        ) : null}
                      </span>
                    </td>
                    <td className="p-4 py-2 text-on-surface/70">{e.facebook_name}</td>
                    <td className="p-4 py-2">
                      <div className="space-y-1.5">
                        {e.advance_payment ? (
                          e.payment_screenshot_url ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2"
                              onClick={() => setScreenshotUrl(e.payment_screenshot_url)}
                            >
                              <CreditCard className="h-3.5 w-3.5" /> View Screenshot
                            </button>
                          ) : (
                            <Badge variant="outline">Paid, no screenshot</Badge>
                          )
                        ) : (
                          <span className="text-on-surface/30">—</span>
                        )}
                        <select
                          value={e.payment_status}
                          disabled={pending}
                          aria-label={`Payment status for ${e.blader_name}`}
                          className={`block border border-outline-variant/40 bg-surface-container-low px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring ${PAYMENT_STATUS_CLASS[e.payment_status]}`}
                          onChange={(ev) => handlePaymentStatus(e, ev.target.value as PreregistrationPaymentStatus)}
                        >
                          {(Object.keys(PAYMENT_STATUS_LABEL) as PreregistrationPaymentStatus[]).map((status) => (
                            <option key={status} value={status}>
                              {PAYMENT_STATUS_LABEL[status]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          aria-label={e.hide_public ? `Show ${e.blader_name} on public` : `Hide ${e.blader_name} on public`}
                          tooltip={e.hide_public ? "Show on public" : "Hide on public"}
                          onClick={() => handleToggleVisibility(e)}
                        >
                          {e.hide_public ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant={added ? "outline" : "default"}
                          disabled={pending || added}
                          aria-label={added ? `${e.blader_name} already added` : `Add ${e.blader_name} to the roster`}
                          tooltip={added ? "Already added to the roster" : "Add this pre-registered player to the roster"}
                          onClick={() => handleAdd(e)}
                        >
                          {added ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          aria-label={`Edit ${e.blader_name}`}
                          tooltip="Edit this pre-registration"
                          onClick={() => setEditing(e)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pending}
                          aria-label={`Remove ${e.blader_name}`}
                          tooltip="Remove this pre-registration"
                          onClick={() => setRemoving(e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {entries.length === 0 ? "No one has pre-registered yet." : "No pre-registrations match your search."}
        </p>
      )}

      <Dialog open={screenshotUrl !== null} onOpenChange={(open) => !open && setScreenshotUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotUrl ? (
            <div className="px-6 pb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotUrl} alt="Payment screenshot" className="w-full border border-outline-variant/30 object-contain" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pre-Registration</DialogTitle>
            <DialogDescription>Corrects the guest&apos;s submitted details.</DialogDescription>
          </DialogHeader>
          {editing ? <EditPreRegistrationForm entry={editing} pending={pending} onSubmit={handleEdit} /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this pre-registration?</DialogTitle>
            <DialogDescription>
              This removes {removing?.blader_name}&apos;s pre-registration submission. It doesn&apos;t affect the roster if
              they were already added. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="outline" tooltip="Keep this submission" disabled={pending} onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" tooltip="This can't be undone" disabled={pending} onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
