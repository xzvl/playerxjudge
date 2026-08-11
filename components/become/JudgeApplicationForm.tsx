"use client";

import { useState } from "react";

import { applyForJudge } from "@/app/become/judge/actions";
import { Button } from "@/components/ui/button";

export function JudgeApplicationForm() {
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  async function handleSubmit() {
    setSubmitting(true);
    setServerMessage(null);
    const result = await applyForJudge();
    setSubmitting(false);
    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
    } else if (result.status === "success") {
      setServerMessage({ type: "success", text: result.message ?? "Application submitted." });
    }
  }

  return (
    <div className="space-y-4">
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
        tooltip="Submit your judge role application"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting..." : "Request Judge Role"}
      </Button>
    </div>
  );
}
