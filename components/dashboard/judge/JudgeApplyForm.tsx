"use client";

import { useState } from "react";

import { applyForJudgeFromAccount } from "@/app/account/judge/apply/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { JudgeBeyzIdUploader } from "@/components/dashboard/judge/JudgeBeyzIdUploader";
import type { BeyzIdStatus } from "@/lib/types/database";

// A BeyZ ID is required to submit — either upload one (see
// JudgeBeyzIdUploader, reused as-is from /account/judge/profile) or check
// the "don't have one yet" box to skip it, matching Judge Profile's own
// treatment of an unset BeyZ ID as a valid, hideable state rather than a
// hard requirement.
export function JudgeApplyForm({
  initialBeyzIdUrl,
  initialBeyzIdStatus,
}: {
  initialBeyzIdUrl: string | null;
  initialBeyzIdStatus: BeyzIdStatus | null;
}) {
  const [noBeyzId, setNoBeyzId] = useState(false);
  const [hasBeyzId, setHasBeyzId] = useState(initialBeyzIdUrl !== null);
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setServerMessage(null);
    const result = await applyForJudgeFromAccount();
    setSubmitting(false);
    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
    } else if (result.status === "success") {
      setServerMessage({ type: "success", text: result.message ?? "Application submitted." });
    }
  }

  const canSubmit = noBeyzId || hasBeyzId;

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-on-surface/70">
        <Checkbox checked={noBeyzId} onChange={(e) => setNoBeyzId(e.target.checked)} className="mt-0.5" />I don&apos;t have a BeyZ ID yet
      </label>

      {!noBeyzId ? (
        <JudgeBeyzIdUploader initialUrl={initialBeyzIdUrl} initialStatus={initialBeyzIdStatus} onUploaded={() => setHasBeyzId(true)} />
      ) : null}

      {serverMessage ? (
        <p
          role={serverMessage.type === "error" ? "alert" : "status"}
          className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
        >
          {serverMessage.text}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="w-full"
        tooltip={canSubmit ? "Submit your judge role application" : "Upload a BeyZ ID or check the box above first"}
        disabled={submitting || !canSubmit}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting..." : "Apply"}
      </Button>
    </div>
  );
}
