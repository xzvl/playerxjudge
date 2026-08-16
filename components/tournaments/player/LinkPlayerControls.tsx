"use client";

import { useState, useTransition } from "react";
import { Clock3, Link as LinkIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cancelParticipantLink, requestParticipantLink } from "@/app/tournaments/[slug]/player/actions";

export interface MyParticipantLink {
  id: string;
  participantId: string;
  status: "pending" | "approved";
}

// Sits beside PlayerNamePicker (see PlayerCurrentStats) and reflects the
// logged-in viewer's own link state relative to whichever participant is
// currently displayed:
//   - no link anywhere in this tournament yet -> "Link Me" (opens a confirm
//     popup) for the currently-shown participant.
//   - their own link is pending -> a Pending indicator + a cancel icon,
//     shown only while that participant is the one on screen (the page
//     auto-selects it by default — see the player page).
//   - their own link is approved -> nothing extra to show; already
//     confirmed.
//   - linked to a *different* participant already -> nothing (one active
//     claim per tournament).
export function LinkPlayerControls({
  tournamentId,
  slug,
  participantId,
  myLink,
}: {
  tournamentId: string;
  slug: string;
  participantId: string;
  myLink: MyParticipantLink | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLinkMe() {
    setError(null);
    startTransition(async () => {
      const result = await requestParticipantLink(tournamentId, participantId, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setConfirmOpen(false);
    });
  }

  function handleCancel() {
    if (!myLink) return;
    setError(null);
    startTransition(async () => {
      await cancelParticipantLink(myLink.id, slug);
    });
  }

  if (myLink && myLink.participantId === participantId) {
    if (myLink.status !== "pending") return null;
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="label-mono flex items-center gap-1.5 bg-surface-container-high px-2 py-1.5 text-on-surface/60">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Pending
        </span>
        <Button
          variant="outline"
          size="icon"
          tooltip="Cancel this link request"
          aria-label="Cancel link request"
          disabled={pending}
          onClick={handleCancel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (myLink) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        tooltip="This is my player profile"
        onClick={() => setConfirmOpen(true)}
      >
        <LinkIcon className="h-3.5 w-3.5" /> Link Me
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link This Player</DialogTitle>
            <DialogDescription>
              Are you sure this is your player profile? Linking this player will associate it with your account.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="px-6 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="gap-2 p-6 pt-0 sm:justify-end">
            <Button type="button" variant="outline" tooltip="Not my player profile" disabled={pending} onClick={() => setConfirmOpen(false)}>
              Not Me
            </Button>
            <Button type="button" tooltip="Confirm this is my player profile" disabled={pending} onClick={handleLinkMe}>
              {pending ? "Linking..." : "Yes, Link Me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
