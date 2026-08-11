"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { generateInitialPairings } from "@/lib/swiss";
import type { TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// Read-only preview of what Round 1 will look like once the group stage
// starts — built with the exact same seeding algorithm (top half vs. bottom
// half by seed) that startGroupStageMatches uses for real, so the preview
// never disagrees with what actually gets generated. Deliberately mirrors
// GroupStageWorkspace's group-tab-bar + round-column layout so the page
// doesn't visually jump once real matches replace this preview.
function ParticipantLine({ participant, isBye }: { participant: TournamentParticipant | null; isBye?: boolean }) {
  if (isBye) return <span className="text-sm italic text-on-surface/40">Bye</span>;
  if (!participant) return <span className="text-sm text-on-surface/40">TBD</span>;
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 font-mono text-xs text-on-surface/40">#{participant.seed}</span>
      <span className="truncate text-on-surface">{participant.team_name ?? participant.name}</span>
    </span>
  );
}

function MatchCard({ index, a, b }: { index: number; a: TournamentParticipant | null; b: TournamentParticipant | null }) {
  return (
    <div className="border border-outline-variant/25 bg-surface-container-low p-1">
      <div className="flex min-h-[50px] items-center gap-3">
        <span className="w-6 shrink-0 text-center font-mono text-xs text-on-surface/40">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <ParticipantLine participant={a} />
          <ParticipantLine participant={b} isBye={b === null} />
        </div>
      </div>
    </div>
  );
}

export function GroupStageRound1Preview({
  groups,
  participants,
}: {
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
}) {
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? "");
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  if (!activeGroup) return null;

  const members = participants.filter((p) => p.group_id === activeGroup.id).sort((a, b) => a.seed - b.seed);
  const byId = new Map(members.map((m) => [m.id, m]));
  const pairings = members.length >= 2 ? generateInitialPairings(members.map((m) => ({ id: m.id, seed: m.seed }))) : [];

  return (
    <div>
      <p className="mt-4 text-sm text-on-surface/50">
        Preview of Round 1, seeded from the current group assignments — it&apos;s subject to change until the group stage
        is started.
      </p>

      <div className="mt-4 mb-4 flex flex-wrap items-center gap-1 border-b border-outline-variant/25 pb-3">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActiveGroupId(g.id)}
            className={cn(
              "label-mono px-3 py-1.5 text-xs transition-colors",
              g.id === activeGroup.id ? "bg-primary text-on-primary" : "text-on-surface/50 hover:text-on-surface"
            )}
          >
            Group {g.label}
          </button>
        ))}
      </div>

      {pairings.length > 0 ? (
        <div className="flex gap-6 overflow-auto pb-4">
          <div className="flex w-72 shrink-0 flex-col gap-3">
            <p className="label-mono sticky top-0 bg-surface py-1 text-center text-on-surface/40">Round 1</p>
            <div className="space-y-2">
              {pairings.map((p, i) => (
                <MatchCard
                  key={p.matchNumber}
                  index={i}
                  a={byId.get(p.participantAId) ?? null}
                  b={p.participantBId ? (byId.get(p.participantBId) ?? null) : null}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-center text-sm text-on-surface/50">
          This group needs at least 2 participants.
        </p>
      )}
    </div>
  );
}
