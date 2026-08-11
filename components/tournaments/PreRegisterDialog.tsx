"use client";

import { useState, useTransition } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentScreenshotField } from "@/components/tournaments/PaymentScreenshotField";
import { formatCurrency } from "@/lib/format";
import { submitPreRegistration, uploadPreRegistrationPaymentScreenshot } from "@/app/tournaments/[slug]/actions";
import type { MockTournament } from "@/lib/mock/tournaments";

// Guest pre-registration popup — no account required. Shown for logged-in
// and anonymous visitors alike (no profile pre-fill for now); when the
// tournament requires pre-registration payment (see Settings), the
// organizer's amount/instructions/QR code show below the form so the player
// knows how to pay before the tournament starts.
export function PreRegisterDialog({
  tournament,
  open,
  onOpenChange,
}: {
  tournament: MockTournament | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [bladerName, setBladerName] = useState("");
  const [facebookName, setFacebookName] = useState("");
  const [hidePublic, setHidePublic] = useState(false);
  const [advancePayment, setAdvancePayment] = useState(false);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFullName("");
    setBladerName("");
    setFacebookName("");
    setHidePublic(false);
    setAdvancePayment(false);
    setPaymentScreenshotUrl(null);
    setScreenshotError(null);
    setError(null);
    setConfirmation(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (!tournament) return;
    setError(null);
    startTransition(async () => {
      const result = await submitPreRegistration(tournament.id, {
        fullName,
        bladerName,
        facebookName,
        hidePublic,
        advancePayment,
        paymentScreenshotUrl,
      });
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setConfirmation(result.message ?? "You're pre-registered!");
    });
  }

  if (!tournament) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pre-register for {tournament.title}</DialogTitle>
          <DialogDescription>No account needed — just the basics so the organizer knows you&apos;re coming.</DialogDescription>
        </DialogHeader>

        {confirmation ? (
          <div className="space-y-4 px-6 pb-6">
            <p role="status" className="text-sm text-primary">
              {confirmation}
            </p>
            <Button type="button" className="w-full" tooltip="Close this dialog" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface" htmlFor="prereg-full-name">
                Full Name
              </label>
              <Input id="prereg-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface" htmlFor="prereg-blader-name">
                Blader Name
              </label>
              <Input id="prereg-blader-name" value={bladerName} onChange={(e) => setBladerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface" htmlFor="prereg-facebook-name">
                Facebook Name
              </label>
              <Input id="prereg-facebook-name" value={facebookName} onChange={(e) => setFacebookName(e.target.value)} />
            </div>
            <label className="flex items-center gap-3 text-sm text-on-surface">
              <Checkbox checked={hidePublic} onChange={(e) => setHidePublic(e.target.checked)} />
              Hide me on public
            </label>

            {tournament.requiresPreregistrationPayment ? (
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm text-on-surface">
                  <Checkbox checked={advancePayment} onChange={(e) => setAdvancePayment(e.target.checked)} />
                  Advance Payment
                </label>

                {advancePayment ? (
                  <div className="grid gap-4 border border-outline-variant/25 bg-surface-container-low p-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      {tournament.preregistrationInstructions ? (
                        <p className="whitespace-pre-line text-sm text-on-surface/70">{tournament.preregistrationInstructions}</p>
                      ) : null}
                      {tournament.preregistrationAmount ? (
                        <p className="text-sm text-on-surface">
                          Registration Fee:{" "}
                          <span className="font-medium">{formatCurrency(tournament.preregistrationAmount)}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-start justify-center">
                      {tournament.preregistrationQrUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tournament.preregistrationQrUrl}
                          alt="Payment QR code"
                          className="h-40 w-40 border border-outline-variant/40 object-cover"
                        />
                      ) : (
                        <p className="text-xs text-on-surface/40">No QR code uploaded yet.</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {advancePayment ? (
                  <div>
                    <PaymentScreenshotField
                      label="Payment Screenshot (required)"
                      maxDimension={1400}
                      disabled={pending}
                      onFileReady={async (file: File) => {
                        setScreenshotError(null);
                        const formData = new FormData();
                        formData.set("file", file);
                        const result = await uploadPreRegistrationPaymentScreenshot(tournament.id, formData);
                        if (result.status === "error") {
                          setScreenshotError(result.message ?? "Couldn't upload that screenshot.");
                          return;
                        }
                        setPaymentScreenshotUrl(result.url ?? null);
                      }}
                    />
                    {screenshotError ? <p className="mt-2 text-xs font-medium text-destructive">{screenshotError}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter className="p-0 pt-2">
              <Button
                type="button"
                tooltip={
                  advancePayment && !paymentScreenshotUrl
                    ? "Upload a payment screenshot first"
                    : "Submit your pre-registration"
                }
                disabled={
                  pending ||
                  !fullName.trim() ||
                  !bladerName.trim() ||
                  !facebookName.trim() ||
                  (advancePayment && !paymentScreenshotUrl)
                }
                onClick={handleSubmit}
              >
                {pending ? "Submitting..." : "Pre-register"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
