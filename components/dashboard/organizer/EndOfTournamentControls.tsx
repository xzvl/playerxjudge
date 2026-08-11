"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { endTournament } from "@/app/account/organizer/tournament/[slug]/matches-actions";

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

// Mirrors StartFinalStageControls's panel layout — same bordered box, same
// copy pattern — for closing out the tournament once every final-stage
// match has a result.
export function EndOfTournamentControls({ tournamentId, slug }: { tournamentId: string; slug: string }) {
  const router = useRouter();
  const [ending, startEnding] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function handleEnd() {
    setMessage(null);
    startEnding(async () => {
      const result = await endTournament(tournamentId, slug);
      if (result.status === "error") {
        setMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-8 space-y-3 border border-outline-variant/25 bg-surface-container-low p-5">
      <p className="text-sm text-on-surface/70">Every match has a result. Ready to crown a champion and close it out?</p>
      <Button
        type="button"
        className="gap-1.5"
        tooltip="Mark the tournament completed and record the champion"
        disabled={ending}
        onClick={handleEnd}
      >
        <Flag className="h-3.5 w-3.5" /> {ending ? "Ending..." : "End of Tournament"}
      </Button>
      <ActionMessage message={message} />
    </div>
  );
}
