"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function ConfirmSide({
  name,
  score,
  confirmed,
  disabled,
  onConfirm,
}: {
  name: string;
  score: number;
  confirmed: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="min-w-0 max-w-full truncate text-sm font-bold text-on-surface">{name}</p>
      <p className="font-mono text-4xl font-bold text-on-surface">{score}</p>
      <Button size="sm" className="w-full gap-1.5" disabled={disabled} onClick={onConfirm}>
        {confirmed ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Confirmed
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Confirm
          </>
        )}
      </Button>
    </div>
  );
}

// Each side confirms independently (locking its own button once pressed);
// the moment both are confirmed, this fires the actual save. A failed save
// re-arms both buttons (via the `error` prop) so the judge can retry.
export function ConfirmResultDialog({
  open,
  onOpenChange,
  player1Name,
  player2Name,
  score1,
  score2,
  onBothConfirmed,
  saving,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player1Name: string;
  player2Name: string;
  score1: number;
  score2: number;
  onBothConfirmed: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [confirmed1, setConfirmed1] = useState(false);
  const [confirmed2, setConfirmed2] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmed1(false);
      setConfirmed2(false);
    }
  }, [open]);

  useEffect(() => {
    if (error) {
      setConfirmed1(false);
      setConfirmed2(false);
    }
  }, [error]);

  useEffect(() => {
    if (confirmed1 && confirmed2) onBothConfirmed();
    // Only the transition to both-true should fire the save — `saving`/
    // `error`/`onBothConfirmed` changing afterward shouldn't re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed1, confirmed2]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Result</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 pb-6">
          <ConfirmSide
            name={player1Name}
            score={score1}
            confirmed={confirmed1}
            disabled={confirmed1 || saving}
            onConfirm={() => setConfirmed1(true)}
          />
          <div className="h-24 w-px bg-outline-variant/25" aria-hidden="true" />
          <ConfirmSide
            name={player2Name}
            score={score2}
            confirmed={confirmed2}
            disabled={confirmed2 || saving}
            onConfirm={() => setConfirmed2(true)}
          />
        </div>
        {error ? (
          <p role="alert" className="mx-6 mb-6 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
