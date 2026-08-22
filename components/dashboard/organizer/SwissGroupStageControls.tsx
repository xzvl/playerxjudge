"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateSwissRounds, updateTournamentStatus } from "@/app/account/organizer/tournament/[slug]/actions";
import { endGroupStage, startGroupStageMatches } from "@/app/account/organizer/tournament/[slug]/matches-actions";

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

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="space-y-1.5">
      <div className="h-2 w-full overflow-hidden bg-surface-container-high">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <p className="label-mono text-on-surface/40">{percent}% of rounds complete</p>
    </div>
  );
}

export function SwissGroupStageControls({
  tournamentId,
  slug,
  currentSwissRounds,
  phase,
  progressPercent,
  allGroupsFinished,
  basePath = "/account/organizer/tournament",
}: {
  tournamentId: string;
  slug: string;
  currentSwissRounds: number;
  phase: "not-assigned" | "ready" | "started";
  progressPercent: number;
  allGroupsFinished: boolean;
  // See TournamentSettingsPanel's own basePath — lets
  // /backend/tournaments/[slug] reuse this unchanged.
  basePath?: string;
}) {
  const router = useRouter();
  const [rounds, setRounds] = useState(currentSwissRounds);
  const [savingRounds, startSavingRounds] = useTransition();
  const [starting, startStarting] = useTransition();
  const [ending, startEnding] = useTransition();
  const [roundsMessage, setRoundsMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [startMessage, setStartMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [endMessage, setEndMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function saveRounds() {
    setRoundsMessage(null);
    startSavingRounds(async () => {
      const result = await updateSwissRounds(tournamentId, slug, rounds);
      setRoundsMessage(
        result.status === "success"
          ? { type: "success", text: result.message ?? "Saved." }
          : { type: "error", text: result.message ?? "Something went wrong." }
      );
      if (result.status === "success") router.refresh();
    });
  }

  function startGroupStage() {
    setStartMessage(null);
    startStarting(async () => {
      const statusResult = await updateTournamentStatus(tournamentId, slug, "ongoing");
      if (statusResult.status === "error") {
        setStartMessage({ type: "error", text: statusResult.message ?? "Something went wrong." });
        return;
      }
      const matchesResult = await startGroupStageMatches(tournamentId, slug);
      setStartMessage(
        matchesResult.status === "success"
          ? { type: "success", text: "Group stage started." }
          : { type: "error", text: matchesResult.message ?? "Started, but round 1 couldn't be generated." }
      );
      router.refresh();
    });
  }

  function handleEndGroupStage() {
    setEndMessage(null);
    startEnding(async () => {
      const result = await endGroupStage(tournamentId, slug);
      if (result.status === "error") {
        setEndMessage({ type: "error", text: result.message ?? "Something went wrong." });
        return;
      }
      router.push(`${basePath}/${slug}/final-stage`);
    });
  }

  return (
    <div className="mt-8 mb-8 grid gap-6 border border-outline-variant/25 bg-surface-container-low p-5 md:grid-cols-2">
      <div className="space-y-3">
        {phase === "started" ? (
          <>
            <p className="text-sm text-on-surface/50">The group stage is already underway.</p>
            <ProgressBar percent={progressPercent} />
            {allGroupsFinished ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  tooltip="Lock in final group standings and move on to the final stage"
                  disabled={ending}
                  onClick={handleEndGroupStage}
                >
                  <Flag className="h-3.5 w-3.5" /> {ending ? "Ending..." : "End of Group Stage"}
                </Button>
                <ActionMessage message={endMessage} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm text-on-surface/70">
              Once your groups are arranged as you&apos;d like and you&apos;re ready, start the group stage:
            </p>
            <Button
              type="button"
              className="gap-1.5"
              tooltip="Move the tournament to ongoing and generate Round 1 for every group"
              disabled={phase !== "ready" || starting}
              onClick={startGroupStage}
            >
              <Play className="h-3.5 w-3.5" /> {starting ? "Starting..." : "Start Group Stage"}
            </Button>
            {phase === "not-assigned" ? (
              <p className="text-xs text-on-surface/40">Assign every participant to a group first.</p>
            ) : null}
            <ActionMessage message={startMessage} />
          </>
        )}
      </div>

      <div className={cn("space-y-3 border-t border-outline-variant/20 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0")}>
        <label htmlFor="swiss-rounds" className="text-sm font-bold text-on-surface">
          Number of Swiss rounds for each group
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="swiss-rounds"
            type="number"
            min={1}
            max={20}
            value={rounds}
            onChange={(e) => setRounds(Math.min(20, Math.max(1, e.target.valueAsNumber || 1)))}
            className="w-24"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            tooltip="Save the number of Swiss rounds per group"
            disabled={savingRounds}
            onClick={saveRounds}
          >
            {savingRounds ? "Saving..." : "Save"}
          </Button>
        </div>
        <ActionMessage message={roundsMessage} />
        <p className="text-xs text-on-surface/50">
          5 or more rounds tends to produce a clearer winner. With 22 or more rounds, your tournament might end early due to
          Swiss pairing rules.
        </p>
      </div>
    </div>
  );
}
