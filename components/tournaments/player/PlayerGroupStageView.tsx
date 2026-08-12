"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GroupStandingsTable } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { ReadOnlyGroupMatches } from "@/components/tournaments/player/ReadOnlyGroupMatches";
import { cn } from "@/lib/utils";
import type { SwissPoints, TieBreakMetric } from "@/lib/validations/tournament-wizard";
import type { Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

// Read-only counterpart to GroupStageWorkspace: same group-switcher /
// Standings-Matches sub-tabs / fullscreen layout, minus every organizer
// write action.
export function PlayerGroupStageView({
  groups,
  participants,
  matches,
  swissPoints,
  tieBreakMetrics,
  advanceCount,
  swissRoundsCap,
  selectedParticipantId,
}: {
  groups: TournamentGroup[];
  participants: TournamentParticipant[];
  matches: Match[];
  swissPoints: SwissPoints;
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric];
  advanceCount: number;
  swissRoundsCap: number;
  selectedParticipantId?: string | null;
}) {
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"standings" | "matches">("matches");
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  if (groups.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        Groups haven&apos;t been assigned yet.
      </p>
    );
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const groupParticipants = participants.filter((p) => p.group_id === activeGroup.id).sort((a, b) => a.seed - b.seed);
  const groupMatches = matches.filter((m) => m.group_id === activeGroup.id);
  const participantsById = new Map(groupParticipants.map((p) => [p.id, { seed: p.seed, name: p.name, teamName: p.team_name }]));

  return (
    <div ref={containerRef} className={cn(fullscreen && "overflow-auto bg-background p-6")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/25 pb-3">
        <div className="flex flex-wrap items-center gap-1">
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
          <span className="mx-2 h-5 w-px shrink-0 bg-outline-variant/30" aria-hidden="true" />
          {(["standings", "matches"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "label-mono px-3 py-1.5 text-xs capitalize transition-colors",
                tab === activeTab ? "border-b-2 border-primary text-primary" : "text-on-surface/50 hover:text-on-surface"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {activeTab === "standings" ? (
        <GroupStandingsTable
          participants={groupParticipants}
          matches={groupMatches}
          swissPoints={swissPoints}
          tieBreakMetrics={tieBreakMetrics}
          advanceCount={advanceCount}
          swissRoundsCap={swissRoundsCap}
        />
      ) : (
        <ReadOnlyGroupMatches matches={groupMatches} participantsById={participantsById} selectedParticipantId={selectedParticipantId} />
      )}
    </div>
  );
}
