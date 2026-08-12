import { Swords } from "lucide-react";

import { UpcomingMatchCard, PreviousMatchCard } from "@/components/tournaments/player/PlayerMatchCard";
import type { RosterLite } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { computeFinishCounts, opponentIdFor, scoreFor } from "@/lib/player-view-stats";
import type { StandingsRow } from "@/lib/swiss";
import type { Match } from "@/lib/types/database";

export function PlayerMatchesSection({
  selectedParticipantId,
  matches,
  allMatches,
  stageLabelFor,
  roundLabelFor,
  participantsById,
  standingsByParticipantId,
}: {
  selectedParticipantId: string;
  // Every match the selected participant is seated in.
  matches: Match[];
  // Every match in the tournament — needed to tally an opponent's own
  // finish history for the "know your opponent" upcoming card.
  allMatches: Match[];
  stageLabelFor: (match: Match) => string;
  roundLabelFor: (match: Match) => string;
  participantsById: Map<string, RosterLite>;
  standingsByParticipantId: Map<string, StandingsRow>;
}) {
  const upcoming = matches
    .filter((m) => m.status !== "completed" && m.participant_b_id !== null)
    .sort((a, b) => a.round - b.round);
  // Most recent first: final-stage matches (Grand Final, Semifinals, ...)
  // always outrank group-stage ones — the final stage only starts once the
  // group stage is done — then within each stage the higher round number is
  // the more recently played one.
  const previous = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => {
      const aFinal = a.group_id === null ? 1 : 0;
      const bFinal = b.group_id === null ? 1 : 0;
      if (aFinal !== bFinal) return bFinal - aFinal;
      return b.round - a.round;
    });

  return (
    <section id="matches" className="scroll-mt-20 space-y-10">
      <h2 className="label-mono flex items-center gap-2 text-primary">
        <Swords className="h-3.5 w-3.5" aria-hidden="true" /> Upcoming / Recent Battle
      </h2>

      {upcoming.length > 0 ? (
        <div>
          <h3 className="heading mb-4 text-lg">Upcoming Matches</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => {
              const opponentId = opponentIdFor(selectedParticipantId, m);
              const opponent = opponentId ? participantsById.get(opponentId) : null;
              const opponentName = opponent ? opponent.teamName ?? opponent.name : "TBD";
              const opponentFinishes = opponentId ? computeFinishCounts(opponentId, allMatches) : { burst: 0, spin: 0, extreme: 0, over: 0 };
              return (
                <UpcomingMatchCard
                  key={m.id}
                  roundLabel={roundLabelFor(m)}
                  stageLabel={stageLabelFor(m)}
                  opponentName={opponentName}
                  opponentFinishes={opponentFinishes}
                  opponentRow={opponentId ? standingsByParticipantId.get(opponentId) ?? null : null}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {previous.length > 0 ? (
        <div>
          <h3 className="heading mb-4 text-lg">Previous Matches</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previous.map((m) => {
              const opponentId = opponentIdFor(selectedParticipantId, m);
              const opponent = opponentId ? participantsById.get(opponentId) : null;
              const opponentName = opponentId === null ? "Bye" : opponent ? opponent.teamName ?? opponent.name : "TBD";
              const won = m.winner_id === selectedParticipantId;
              return (
                <PreviousMatchCard
                  key={m.id}
                  roundLabel={roundLabelFor(m)}
                  stageLabel={stageLabelFor(m)}
                  opponentName={opponentName}
                  match={m}
                  playerFinishes={computeFinishCounts(selectedParticipantId, [m])}
                  won={won}
                  score={scoreFor(selectedParticipantId, m)}
                  participantsById={participantsById}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {upcoming.length === 0 && previous.length === 0 ? (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No matches for this participant yet.
        </p>
      ) : null}
    </section>
  );
}
