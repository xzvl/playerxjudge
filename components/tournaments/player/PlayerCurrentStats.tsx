import { Radio, UserRound } from "lucide-react";

import { PlayerNamePicker, type PlayerOption } from "@/components/tournaments/player/PlayerNamePicker";
import { LinkPlayerControls, type MyParticipantLink } from "@/components/tournaments/player/LinkPlayerControls";
import { finalRankLabel } from "@/lib/final-stage-placeholder";
import type { StandingsRow } from "@/lib/swiss";
import type { TieBreakMetric } from "@/lib/validations/tournament-wizard";

function tieBreakLabel(metric: TieBreakMetric, options: readonly { value: string; label: string }[]): string {
  return options.find((o) => o.value === metric)?.label ?? metric;
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="border border-outline-variant/25 bg-surface-container-low px-4 py-5 text-center">
      <p className="font-mono text-2xl font-bold text-on-surface md:text-3xl">{value}</p>
      <p className="label-mono mt-1 text-[10px] text-on-surface/40">{label}</p>
    </div>
  );
}

export function PlayerCurrentStats({
  statusLabel,
  isOngoing,
  options,
  selectedId,
  groupRow,
  groupRank,
  finalRank,
  showGroupRanking,
  showFinalRanking,
  tieBreakMetrics,
  tieBreakOptions,
  currentStationName,
  tournamentId,
  slug,
  myLink,
}: {
  statusLabel: string;
  isOngoing: boolean;
  options: PlayerOption[];
  selectedId: string | null;
  groupRow: StandingsRow | null;
  groupRank: number | null;
  finalRank: number | null;
  showGroupRanking: boolean;
  showFinalRanking: boolean;
  tieBreakMetrics: [TieBreakMetric, TieBreakMetric, TieBreakMetric] | null;
  tieBreakOptions: readonly { value: string; label: string }[];
  // The stadium the selected participant is playing at right now — set
  // only while they have a match a judge has actually started (see
  // startMatchAtStation in JudgeConsole.tsx), null the moment it's
  // reported or cleared.
  currentStationName?: string | null;
  // "Link Me" — only rendered for a signed-in viewer (tournamentId set is
  // the signal; see TournamentPlayerPage). See LinkPlayerControls.
  tournamentId?: string;
  slug?: string;
  myLink?: MyParticipantLink | null;
}) {
  return (
    <section id="player" className="scroll-mt-20">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="label-mono flex items-center gap-2 text-primary">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Current Stats
        </h2>
        <span className={`label-mono px-2 py-1 ${isOngoing ? "animate-blink text-primary" : "text-on-surface/50"}`}>
          {statusLabel}
        </span>
        {currentStationName ? (
          <span className="label-mono flex items-center gap-1.5 bg-primary/10 px-2 py-1 text-primary">
            <Radio className="h-3 w-3" aria-hidden="true" /> Station: {currentStationName}
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <PlayerNamePicker options={options} selectedId={selectedId} />
        </div>
        {tournamentId && slug && selectedId ? (
          <LinkPlayerControls tournamentId={tournamentId} slug={slug} participantId={selectedId} myLink={myLink ?? null} />
        ) : null}
      </div>

      {selectedId ? (
        <>
          {showFinalRanking || showGroupRanking ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-on-surface/70">
              {showFinalRanking ? (
                <span>
                  Current Final Ranking:{" "}
                  <span className="font-mono font-semibold text-primary">{finalRank ? finalRankLabel(finalRank) : "—"}</span>
                </span>
              ) : null}
              {showGroupRanking ? (
                <span>
                  Group Ranking: <span className="font-mono font-semibold text-primary">{groupRank ?? "—"}</span>
                </span>
              ) : null}
            </p>
          ) : null}

          {groupRow && tieBreakMetrics ? (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCell value={`${groupRow.wins}-${groupRow.losses}-${groupRow.ties}`} label="W-L-T" />
              <StatCell value={groupRow.score} label="Score" />
              <StatCell value={groupRow.tieBreak1} label={tieBreakLabel(tieBreakMetrics[0], tieBreakOptions)} />
              <StatCell value={groupRow.tieBreak2} label={tieBreakLabel(tieBreakMetrics[1], tieBreakOptions)} />
              <StatCell value={groupRow.tieBreak3} label={tieBreakLabel(tieBreakMetrics[2], tieBreakOptions)} />
            </div>
          ) : (
            <p className="mt-6 text-sm text-on-surface/40">
              Group-stage stats aren&apos;t available for this tournament&apos;s format yet.
            </p>
          )}
        </>
      ) : (
        <p className="mt-6 text-sm text-on-surface/40">Pick a participant above to see their stats.</p>
      )}
    </section>
  );
}
