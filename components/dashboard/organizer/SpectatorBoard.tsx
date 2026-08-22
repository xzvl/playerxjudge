"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Gavel, Maximize2, Minimize2, Radio, RadioTower } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRealtimeMatches } from "@/lib/hooks/use-realtime-matches";
import { useRealtimeRows } from "@/lib/hooks/use-realtime-rows";
import { cn } from "@/lib/utils";
import type { Judge, Match, TournamentGroup, TournamentStation } from "@/lib/types/database";

// Same three-bucket stage simplification as the judge Match History page
// and the player view (no single stored human label for a placement
// bracket — see Bracket's `structure`).
function stageLabel(m: Match, groupLabelById: Map<string, string>): string {
  if (m.group_id) return `Group ${groupLabelById.get(m.group_id) ?? "—"}`;
  if (m.bracket_id) return "Placement Bracket";
  return "Final Stage";
}

function MatchCard({
  match,
  stage,
  nameOf,
  live,
  stationName,
  judgeName,
  judgePlaying,
}: {
  match: Match;
  stage: string;
  nameOf: (id: string | null) => string;
  live: boolean;
  // Only ever set for a "Playing Now" card — an upcoming match hasn't been
  // called to a station or picked up by a judge yet.
  stationName?: string | null;
  judgeName?: string | null;
  // One of this match's own two players is also an approved judge on this
  // tournament (see getJudgeParticipantIds) — flagged on "Upcoming" cards so
  // whoever's calling matches to stations knows to route them to a
  // different judge. Amber rather than the "LIVE" primary color so the two
  // never read as the same kind of flag.
  judgePlaying?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border p-5",
        live
          ? "border-primary bg-primary/5"
          : judgePlaying
            ? "border-amber-400/60 bg-amber-400/10"
            : "border-outline-variant/25 bg-surface-container-low"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-mono text-on-surface/40">
          {stage} · Round {match.round}
        </span>
        {live ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" /> LIVE
          </span>
        ) : judgePlaying ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-amber-500">
            <Gavel className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Judge Playing
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-lg font-bold text-on-surface" title={nameOf(match.participant_a_id)}>
          {nameOf(match.participant_a_id)}
        </p>
        <span className="shrink-0 text-sm text-on-surface/30">vs</span>
        <p className="min-w-0 flex-1 truncate text-right text-lg font-bold text-on-surface" title={nameOf(match.participant_b_id)}>
          {nameOf(match.participant_b_id)}
        </p>
      </div>
      {stationName || judgeName ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-outline-variant/20 pt-3 text-xs text-on-surface/50">
          {stationName ? (
            <span className="flex items-center gap-1.5">
              <RadioTower className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {stationName}
            </span>
          ) : null}
          {judgeName ? (
            <span className="flex items-center gap-1.5">
              <Gavel className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {judgeName}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Big-screen, spectator-facing display of what's happening right now
// (behind /account/organizer/tournament/[slug]/spectator) — meant for a
// projector/TV near the venue, not the organizer's own workspace, so it
// covers the whole viewport (fixed inset-0) rather than sitting inside the
// dashboard's sidebar/header chrome that every other tournament workspace
// page renders inside of. Stays fully live: useRealtimeMatches (same
// subscription the player view and every organizer bracket workspace
// already use) for match status/score, plus useRealtimeRows on
// tournament_stations/judges for the station+judge shown on each "Playing
// Now" card — so a result, a station call, or a judge switching stations
// all show up here immediately, no refresh needed. The stations/judges feed
// depends on 20250101000054_stations_judges_realtime.sql (adds both tables
// to the supabase_realtime publication — only `matches` was on it before).
export function SpectatorBoard({
  tournamentId,
  tournamentTitle,
  initialMatches,
  groups,
  participantNames,
  initialStations,
  initialJudges,
  judgeNameByJudgeId,
  judgePlayerParticipantIds,
}: {
  tournamentId: string;
  tournamentTitle: string;
  initialMatches: Match[];
  groups: TournamentGroup[];
  participantNames: Record<string, string>;
  initialStations: TournamentStation[];
  initialJudges: Judge[];
  // judge_id -> display name — static (a judge's own name essentially never
  // changes mid-tournament), unlike stations/judges below which need to stay
  // live for their station_id/current_match_id assignments.
  judgeNameByJudgeId: Record<string, string>;
  // tournament_participants ids that are also an approved judge on this
  // tournament (see getJudgeParticipantIds) — static for the same reason
  // judgeNameByJudgeId is: who's linked to a judge account doesn't change
  // mid-event, only where they're currently stationed does.
  judgePlayerParticipantIds: string[];
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  useRealtimeMatches(tournamentId, setMatches);

  const [stations, setStations] = useState<TournamentStation[]>(initialStations);
  useRealtimeRows<TournamentStation>("tournament_stations", tournamentId, setStations);

  const [judges, setJudges] = useState<Judge[]>(initialJudges);
  useRealtimeRows<Judge>("judges", tournamentId, setJudges);

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    function onChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  const groupLabelById = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);
  function nameOf(id: string | null): string {
    return (id && participantNames[id]) || "TBD";
  }

  const judgePlayerIds = useMemo(() => new Set(judgePlayerParticipantIds), [judgePlayerParticipantIds]);
  function hasJudgePlaying(m: Match): boolean {
    return (!!m.participant_a_id && judgePlayerIds.has(m.participant_a_id)) || (!!m.participant_b_id && judgePlayerIds.has(m.participant_b_id));
  }

  // A station "runs" whichever match it's currently pointed at
  // (tournament_stations.current_match_id), and at most one approved judge
  // can hold a given station at a time (judges.station_id — partial unique
  // index). Chained together here into one matchId -> {station, judge} map
  // for "Playing Now" cards; an upcoming match hasn't been called to a
  // station yet, so this never has an entry for one.
  const matchInfoById = useMemo(() => {
    const judgeByStationId = new Map(judges.filter((j) => j.status === "approved" && j.station_id).map((j) => [j.station_id as string, j]));
    const map = new Map<string, { stationName: string; judgeName: string | null }>();
    for (const s of stations) {
      if (!s.current_match_id) continue;
      const judge = judgeByStationId.get(s.id);
      map.set(s.current_match_id, { stationName: s.name, judgeName: judge ? (judgeNameByJudgeId[judge.judge_id] ?? "Unknown Judge") : null });
    }
    return map;
  }, [stations, judges, judgeNameByJudgeId]);

  const playing = useMemo(
    () => matches.filter((m) => m.status === "ongoing").sort((a, b) => a.round - b.round || a.match_number - b.match_number),
    [matches]
  );
  // "Ready to play next" — both seats already decided (excludes a future
  // bracket slot still waiting on an earlier round's winner) but not
  // started yet.
  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status === "scheduled" && m.participant_a_id && m.participant_b_id)
        .sort((a, b) => a.round - b.round || a.match_number - b.match_number),
    [matches]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/25 px-6 py-4">
        <div>
          <p className="label-mono text-primary">Spectator Mode</p>
          <h1 className="heading text-xl">{tournamentTitle}</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          tooltip={fullscreen ? "Exit full screen" : "Enter full screen"}
          onClick={toggleFullscreen}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {fullscreen ? "Exit Full Screen" : "Full Screen"}
        </Button>
      </header>

      <div className="flex-1 space-y-10 px-6 py-8">
        <section>
          <h2 className="label-mono mb-4 flex items-center gap-2 text-primary">
            <Radio className="h-4 w-4" aria-hidden="true" /> Playing Now ({playing.length})
          </h2>
          {playing.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {playing.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  stage={stageLabel(m, groupLabelById)}
                  nameOf={nameOf}
                  live
                  stationName={matchInfoById.get(m.id)?.stationName}
                  judgeName={matchInfoById.get(m.id)?.judgeName}
                />
              ))}
            </div>
          ) : (
            <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
              No matches in progress right now.
            </p>
          )}
        </section>

        <section>
          <h2 className="label-mono mb-4 flex items-center gap-2 text-on-surface/50">
            <Clock className="h-4 w-4" aria-hidden="true" /> Upcoming ({upcoming.length})
          </h2>
          {upcoming.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {upcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  stage={stageLabel(m, groupLabelById)}
                  nameOf={nameOf}
                  live={false}
                  judgePlaying={hasJudgePlaying(m)}
                />
              ))}
            </div>
          ) : (
            <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
              No upcoming matches queued.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
