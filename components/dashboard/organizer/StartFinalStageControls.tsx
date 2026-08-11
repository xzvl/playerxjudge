"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startFinalStage } from "@/app/account/organizer/tournament/[slug]/matches-actions";

function ActionMessage({ message }: { message: { type: "error" | "success"; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      role={message.type === "error" ? "alert" : "status"}
      className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
    >
      {message.text}
    </p>
  );
}

// Mirrors SwissGroupStageControls's "Start Group Stage" panel layout — same
// bordered box, same copy pattern — just for the final bracket instead.
export function StartFinalStageControls({ tournamentId, slug }: { tournamentId: string; slug: string }) {
  const router = useRouter();
  const [starting, startStarting] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function handleStart() {
    setMessage(null);
    startStarting(async () => {
      const result = await startFinalStage(tournamentId, slug);
      if (result.status === "error") {
        setMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-8 space-y-3 border border-outline-variant/25 bg-surface-container-low p-5">
      <p className="text-sm text-on-surface/70">
        The group stage has ended. Ready to seed Round 1 of the bracket from the final group standings?
      </p>
      <Button
        type="button"
        className="gap-1.5"
        tooltip="Seed Round 1 of the final bracket from the group standings"
        disabled={starting}
        onClick={handleStart}
      >
        <Play className="h-3.5 w-3.5" /> {starting ? "Starting..." : "Start the Final Stage"}
      </Button>
      <ActionMessage message={message} />
    </div>
  );
}
