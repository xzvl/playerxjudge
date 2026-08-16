"use client";

import { useState, useTransition } from "react";
import { Ban, Check } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { confirmParticipantLink, declineParticipantLink } from "@/app/account/organizer/participants/actions";
import type { ParticipantLinkStatus } from "@/lib/types/database";

// Shared between /account/organizer/participants (ParticipantsPanel, every
// tournament at once) and /account/organizer/tournament/[slug]/participants
// (TournamentParticipantsWorkspace, one tournament's roster) — same
// "who's requested/been confirmed as this roster entry's real account"
// concept in both places, see 20250101000036_participant_links.sql.
export interface ParticipantLinkInfo {
  id: string;
  status: ParticipantLinkStatus;
  requesterName: string;
}

const LINK_STATUS_VARIANTS: Record<ParticipantLinkStatus, BadgeProps["variant"]> = {
  pending: "outline",
  approved: "success",
};

export function LinkedAccountCell({ link }: { link: ParticipantLinkInfo | null }) {
  if (!link) return <span className="text-on-surface/40">Not linked</span>;
  return (
    <div className="flex items-center gap-2">
      <Badge variant={LINK_STATUS_VARIANTS[link.status]}>{link.status}</Badge>
      <span className="text-on-surface/70">{link.requesterName}</span>
    </div>
  );
}

// Confirm (with a popup) / Decline icon buttons for one pending link
// request — icon-only, ghost-styled to sit alongside a roster row's other
// icon actions (Edit/Substitute/Remove — see TournamentParticipantsWorkspace),
// rather than wrapping itself in its own button group. Renders nothing
// once approved (or if there's no request at all). Errors go through
// onError rather than an inline message, since there's no room for one in
// a tight icon row — the caller already has a page-level error banner.
export function ParticipantLinkActions({
  participantLabel,
  link,
  onConfirmed,
  onDeclined,
  onError,
}: {
  participantLabel: string;
  link: ParticipantLinkInfo | null;
  onConfirmed: () => void;
  onDeclined: () => void;
  onError?: (message: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!link || link.status !== "pending") return null;
  const linkId = link.id;

  function handleConfirm() {
    setDialogError(null);
    startTransition(async () => {
      const result = await confirmParticipantLink(linkId);
      if (result.status === "error") {
        setDialogError(result.message ?? "Something went wrong.");
        return;
      }
      setConfirmOpen(false);
      onConfirmed();
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineParticipantLink(linkId);
      if (result.status === "error") {
        onError?.(result.message ?? "Something went wrong.");
        return;
      }
      onDeclined();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        tooltip="Confirm this link request"
        aria-label="Confirm link request"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        tooltip="Decline this link request"
        aria-label="Decline link request"
        disabled={pending}
        onClick={handleDecline}
      >
        <Ban className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Link</DialogTitle>
            <DialogDescription>
              Link <span className="font-medium text-on-surface">{participantLabel}</span> to{" "}
              <span className="font-medium text-on-surface">{link.requesterName}</span>&apos;s account? They&apos;ll be able to
              see this tournament&apos;s matches under their own account from here on.
            </DialogDescription>
          </DialogHeader>
          {dialogError ? (
            <p role="alert" className="px-6 text-sm text-destructive">
              {dialogError}
            </p>
          ) : null}
          <DialogFooter className="p-6 pt-0">
            <Button type="button" tooltip="Confirm this link" disabled={pending} onClick={handleConfirm}>
              {pending ? "Confirming..." : "Confirm Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
