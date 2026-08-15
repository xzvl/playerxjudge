"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MatchDetailsDialog, type RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { useDragScroll } from "@/lib/hooks/use-drag-scroll";
import { cn } from "@/lib/utils";
import type { Match, MatchScore } from "@/lib/types/database";

// Read-only counterpart to GroupStageWorkspace's MatchesTab — same round
// columns and match-card layout, but no Start/Report/Edit icons (this page
// is spectator-facing, not organizer-facing): hovering a match only offers
// Match Details.

function isScore(value: Match["score"]): value is MatchScore {
  return typeof value === "object" && value !== null && "a" in value && "b" in value;
}

function ParticipantLine({ participant, isBye }: { participant: RosterLite | null; isBye?: boolean }) {
  if (isBye) return <span className="text-sm italic text-on-surface/40">Bye</span>;
  if (!participant) return <span className="text-sm text-on-surface/40">TBD</span>;
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span className="text-xs flex h-6 w-6 shrink-0 items-center justify-center bg-surface-container-high text-on-surface/40">{participant.seed}</span>
      <span className="truncate text-xs text-on-surface">{participant.teamName ?? participant.name}</span>
    </span>
  );
}

function ScoreChip({ value, isWinner, isLoser }: { value: number; isWinner: boolean; isLoser: boolean }) {
  return (
    <span
      className={cn(
        "label-mono flex h-6 w-6 shrink-0 items-center justify-center",
        isWinner && "bg-primary/20 font-bold text-primary",
        isLoser && "bg-surface-container-high text-on-surface/40"
      )}
    >
      {value}
    </span>
  );
}

function MatchRow({
  match,
  participantsById,
  onDetails,
  selectedParticipantId,
}: {
  match: Match;
  participantsById: Map<string, RosterLite>;
  onDetails: () => void;
  selectedParticipantId?: string | null;
}) {
  const a = match.participant_a_id ? participantsById.get(match.participant_a_id) ?? null : null;
  const isBye = match.participant_b_id === null;
  const b = isBye ? null : match.participant_b_id ? participantsById.get(match.participant_b_id) ?? null : null;
  const score = isScore(match.score) ? match.score : null;
  const aWins = score !== null && match.winner_id === match.participant_a_id;
  const bWins = score !== null && match.winner_id === match.participant_b_id;
  const isSelectedMatch =
    !!selectedParticipantId &&
    (match.participant_a_id === selectedParticipantId || match.participant_b_id === selectedParticipantId);

  return (
    <div
      className={cn(
        "group relative border lg:p-1",
        match.status === "ongoing" ? "border-primary/60 bg-primary/5" : "border-outline-variant/25 bg-surface-container-low",
        isSelectedMatch && "ring-2 ring-primary/70"
      )}
    >
      <div className="flex min-h-[48px] items-center gap-3">
        <span className="w-6 shrink-0 text-center font-mono text-xs text-on-surface/40">{match.match_number}</span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <ParticipantLine participant={a} />
            {score ? <ScoreChip value={score.a} isWinner={aWins} isLoser={bWins} /> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <ParticipantLine participant={b} isBye={isBye} />
            {score && !isBye ? <ScoreChip value={score.b} isWinner={bWins} isLoser={aWins} /> : null}
          </div>
        </div>
      </div>

      {!isBye ? (
        <div className="pointer-events-none absolute left-full top-1/2 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 z-20">
          <div className="flex items-center gap-1 border border-outline-variant/40 bg-surface-container-lowest p-1 shadow-lg">
            <Button type="button" variant="ghost" size="icon" aria-label="Match details" onClick={onDetails}>
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoundColumn({
  round,
  matches,
  participantsById,
  onDetails,
  selectedParticipantId,
}: {
  round: number;
  matches: Match[];
  participantsById: Map<string, RosterLite>;
  onDetails: (m: Match) => void;
  selectedParticipantId?: string | null;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <p className="label-mono sticky top-0 bg-surface py-1 text-center text-on-surface/40">Round {round}</p>
      {matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              participantsById={participantsById}
              onDetails={() => onDetails(m)}
              selectedParticipantId={selectedParticipantId}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[8rem] flex-1 items-center justify-center border border-dashed border-outline-variant/20 p-4 text-center text-xs text-on-surface/30">
          Not yet available
        </div>
      )}
    </div>
  );
}

export function ReadOnlyGroupMatches({
  matches,
  participantsById,
  selectedParticipantId,
}: {
  matches: Match[];
  participantsById: Map<string, RosterLite>;
  selectedParticipantId?: string | null;
}) {
  const scrollRef = useDragScroll<HTMLDivElement>();
  const [detailsMatch, setDetailsMatch] = useState<Match | null>(null);
  const latestRound = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const rounds = Array.from({ length: latestRound }, (_, i) => i + 1);

  if (rounds.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        Matches will appear once the group stage starts.
      </p>
    );
  }

  return (
    <div>
      <div ref={scrollRef} className="flex max-h-[85vh] lg:max-h-[75vh] cursor-grab select-none gap-6 overflow-auto px-1 pb-4 active:cursor-grabbing">
        {rounds.map((r) => (
          <RoundColumn
            key={r}
            round={r}
            matches={matches.filter((m) => m.round === r).sort((x, y) => x.match_number - y.match_number)}
            participantsById={participantsById}
            onDetails={setDetailsMatch}
            selectedParticipantId={selectedParticipantId}
          />
        ))}
      </div>
      <MatchDetailsDialog
        open={detailsMatch !== null}
        onOpenChange={(open) => !open && setDetailsMatch(null)}
        match={detailsMatch}
        participantsById={participantsById}
      />
    </div>
  );
}
