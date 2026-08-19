import { cn } from "@/lib/utils";
import type { FinalStandingRow } from "@/lib/final-stage-placeholder";

// Standings page's Final Stage tab: just Rank, Participant, and Match
// History — the elimination bracket doesn't have the W-L-T/score/tie-break
// columns a Swiss group does (see FinalStandingRow's doc comment for why
// "rank" is approximate until later rounds are real).
export function FinalStageStandingsTable({
  rows,
  highlightParticipantIds,
}: {
  rows: FinalStandingRow[];
  // Participants whose linked account is also an approved judge on this
  // tournament (see getJudgeParticipantIds) — their name gets a yellow
  // highlight so a player/judge dual role never reads as an ordinary entry.
  highlightParticipantIds?: Set<string>;
}) {
  if (rows.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        Standings will appear once the final stage starts.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-outline-variant/25">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
            <th className="p-4" scope="col">Rank</th>
            <th className="p-4" scope="col">Participant</th>
            <th className="p-4" scope="col">Match History</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.participantId} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
              <td className="p-4 font-mono text-on-surface/60">{i + 1}</td>
              <td className="p-4 font-medium text-on-surface">
                <span className={cn(highlightParticipantIds?.has(r.participantId) && "bg-yellow-400/30 px-1")}>{r.teamName ?? r.name}</span>
              </td>
              <td className="p-4">
                <div className="flex gap-1">
                  {r.matchHistory.map((m, idx) => (
                    <span
                      key={idx}
                      title={`Round ${m.round}`}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center text-[10px] font-bold",
                        m.result === "W" && "bg-emerald-600/80 text-white",
                        m.result === "L" && "bg-error text-on-error",
                        m.result === "TBD" && "bg-surface-container-high text-on-surface/60",
                        m.result === "BYE" && "border border-outline-variant/40 text-on-surface/40"
                      )}
                    >
                      {m.result === "BYE" ? "B" : m.result === "TBD" ? "?" : m.result}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
