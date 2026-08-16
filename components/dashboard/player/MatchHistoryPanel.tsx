"use client";

import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { formatDate, formatTime } from "@/lib/format";
import { FINISH_TYPE_LABELS } from "@/lib/player/stats";
import { cn } from "@/lib/utils";
import type { PlayerMatch } from "@/lib/player/linked-participants";
import type { FinishType } from "@/lib/types/database";

const ALL = "all";

const RESULT_BADGE_VARIANT: Record<PlayerMatch["result"], BadgeProps["variant"]> = {
  won: "success",
  lost: "destructive",
  draw: "outline",
};

// "Group A - Round 3", or just "Final Round" once out of group play — no
// per-round naming exists for the final bracket (Quarterfinal/Semifinal
// aren't stored anywhere), so every non-group stage collapses to one label
// rather than a fabricated round number.
function stageRoundLabel(stage: string, round: number): string {
  return stage === "Final Stage" ? "Final Round" : `${stage} - Round ${round}`;
}

// Same initials logic as the tournament player view's own Previous Matches
// card (PlayerMatchCard.tsx) — duplicated rather than imported since that
// component lives under components/tournaments/player and isn't exported
// for reuse outside its own section.
function initials(name: string) {
  const parts = name.replace(/^Team\s+/i, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function MatchHistoryPanel({ matches }: { matches: PlayerMatch[] }) {
  const [result, setResult] = useState<string>(ALL);
  const [finishType, setFinishType] = useState<string>(ALL);

  const filtered = useMemo(
    () =>
      matches.filter((m) => {
        if (result !== ALL && m.result !== result) return false;
        if (finishType !== ALL && m.finishType !== finishType) return false;
        return true;
      }),
    [matches, result, finishType]
  );

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:max-w-md">
        <Combobox
          label="Result"
          value={result}
          onValueChange={setResult}
          options={[
            { value: ALL, label: "All Results" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
            { value: "draw", label: "Draw" },
          ]}
        />
        <Combobox
          label="Finish Type"
          value={finishType}
          onValueChange={setFinishType}
          options={[
            { value: ALL, label: "All Finish Types" },
            ...(Object.keys(FINISH_TYPE_LABELS) as FinishType[]).map((ft) => ({
              value: ft,
              label: FINISH_TYPE_LABELS[ft],
            })),
          ]}
        />
      </div>

      {filtered.length > 0 ? (
        <>
          {/* Below lg: one card per match, styled like the tournament
              player view's own Previous Matches recap card (see
              PlayerMatchCard's PreviousMatchCard) — same round/stage meta
              row, avatar + name, and Win/Lost pill. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {filtered.map((m) => (
              <article key={m.id} className="flex flex-col gap-3 border border-outline-variant/25 bg-surface-container-low p-4">
                <div className="label-mono flex items-center justify-between text-[10px]">
                  <span className="text-on-surface/40">Match {m.matchNumber}</span>
                  <span
                    className={cn(
                      "px-2 py-1",
                      m.stage === "Final Stage" ? "bg-primary/15 text-primary" : "bg-surface-container-high text-on-surface/50"
                    )}
                  >
                    {stageRoundLabel(m.stage, m.round)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials(m.opponent)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-on-surface">{m.opponent}</p>
                    <p className="truncate text-xs text-on-surface/50">{m.tournamentTitle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/15 pt-3">
                  <span
                    className={cn(
                      "label-mono px-2 py-1 text-[10px]",
                      m.result === "won"
                        ? "bg-emerald-600/80 text-white"
                        : m.result === "lost"
                          ? "bg-error text-on-error"
                          : "bg-surface-container-high text-on-surface/60"
                    )}
                  >
                    {m.result === "won" ? "Win" : m.result === "lost" ? "Lost" : "Draw"}
                  </span>
                  <span className="text-xs text-on-surface/50">
                    {m.playedAt ? `${formatDate(m.playedAt)} · ${formatTime(m.playedAt)}` : "—"}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* lg and up: the full table. */}
          <div className="hidden overflow-x-auto border border-outline-variant/25 lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <th className="p-4" scope="col">Tournament</th>
                  <th className="p-4" scope="col">Opponent</th>
                  <th className="p-4" scope="col">Round</th>
                  <th className="p-4" scope="col">Result</th>
                  <th className="p-4" scope="col">Finish</th>
                  <th className="p-4" scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-on-surface">{m.tournamentTitle}</td>
                    <td className="p-4 text-on-surface/60">{m.opponent}</td>
                    <td className="p-4 text-on-surface/60">
                      {m.stage} · Round {m.round}
                    </td>
                    <td className="p-4">
                      <Badge variant={RESULT_BADGE_VARIANT[m.result]}>{m.result}</Badge>
                    </td>
                    <td className="p-4 text-on-surface/60">{m.finishType ? FINISH_TYPE_LABELS[m.finishType] : "—"}</td>
                    <td className="p-4 text-on-surface/60">
                      {m.playedAt ? `${formatDate(m.playedAt)} · ${formatTime(m.playedAt)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {matches.length === 0 ? "No matches yet — link yourself to a tournament roster to start tracking history." : "No matches match your filters."}
        </p>
      )}
    </div>
  );
}
