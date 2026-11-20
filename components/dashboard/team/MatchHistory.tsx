import Link from "next/link";
import { ChevronRight, Pencil, Swords } from "lucide-react";

import { MatchApproveButton } from "@/components/dashboard/team/MatchApproveButton";
import { MatchDeleteButton } from "@/components/dashboard/team/MatchDeleteButton";
import { formatLeagueDate, PlayerAvatar, ResultPill } from "@/components/dashboard/team/team-ui";
import { EmptyState } from "@/components/dashboard/erp";
import { BATTLE_FINISH_LABEL, BATTLE_FINISH_POINTS } from "@/lib/teams/constants";
import type { LeagueMatchRow } from "@/lib/teams/queries";
import { matchResult } from "@/lib/teams/standings";
import { cn } from "@/lib/utils";

// Newest-first match log. Each row expands (native <details>, no JS) to its
// battles when any were recorded.
export function MatchHistory({
  matches,
  canEdit,
  editHref,
  emptyAction,
  canApprove,
}: {
  matches: LeagueMatchRow[];
  // Managers (owner / captain / sub-captain) can approve pending matches.
  canApprove?: boolean;
  // Which rows the viewer may edit/delete; omit for read-only (public) use.
  canEdit?: (match: LeagueMatchRow) => boolean;
  editHref?: (match: LeagueMatchRow) => string;
  emptyAction?: React.ReactNode;
}) {
  if (matches.length === 0) {
    return <EmptyState icon={Swords} title="No matches yet" description="Logged matches show up here, newest first." action={emptyAction} />;
  }

  return (
    <ul className="divide-y divide-outline-variant/15 rounded-lg border border-outline-variant/25">
      {matches.map((m) => {
        const result = matchResult(m.playerPoints, m.opponentPoints);
        const editable = canEdit?.(m) ?? false;
        const summary = (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[6.5rem_1fr_auto_auto]">
            <span className="hidden text-xs tabular-nums text-on-surface/50 sm:block">{formatLeagueDate(m.playedOn)}</span>
            <div className="flex min-w-0 items-center gap-2">
              <PlayerAvatar profile={m.player} size="xs" />
              <p className="min-w-0 truncate text-[13px]">
                <span className="font-medium">{m.player.displayName}</span>
                <span className="text-on-surface/45"> vs </span>
                <span className="font-medium">{m.opponentName}</span>
                {m.opponentTeam ? <span className="text-on-surface/45"> · {m.opponentTeam}</span> : null}
              </p>
            </div>
            <div className="col-start-3 flex items-center gap-2 sm:col-start-auto">
              <span className="font-mono text-[13px] font-semibold tabular-nums">
                {m.playerPoints}
                <span className="px-1 text-on-surface/35">–</span>
                {m.opponentPoints}
              </span>
              {m.status === "pending" ? (
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[11px] font-medium text-amber-500">
                  Pending
                </span>
              ) : (
                <ResultPill result={result} />
              )}
            </div>
            <div className="hidden items-center justify-end gap-1 sm:flex">
              {m.battles.length > 0 ? (
                <span className="flex items-center gap-1 text-xs text-on-surface/45">
                  {m.battles.length} battle{m.battles.length === 1 ? "" : "s"}
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
                </span>
              ) : (
                <span className="w-[4.5rem]" />
              )}
            </div>
          </div>
        );

        return (
          <li key={m.id} id={`match-${m.id}`}>
            {m.battles.length > 0 || m.notes ? (
              <details className="group">
                <summary className="cursor-pointer list-none hover:bg-surface-container/40 [&::-webkit-details-marker]:hidden">{summary}</summary>
                <div className="space-y-2 border-t border-outline-variant/15 bg-surface-container-lowest/50 px-3 py-2.5">
                  {m.battles.length > 0 ? (
                    <ol className="space-y-1">
                      {m.battles.map((b) => (
                        <li key={b.battleNo} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                          <span className="w-14 shrink-0 text-xs tabular-nums text-on-surface/45">Battle {b.battleNo}</span>
                          <span className="font-medium">{b.playerBeyblade ?? "Beyblade"}</span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-px text-[11px] font-medium",
                              b.outcome === "win" ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
                            )}
                          >
                            {b.outcome === "win" ? "Win" : "Lost"}
                          </span>
                          <span className="text-on-surface/60">
                            by {BATTLE_FINISH_LABEL[b.finish]} <span className="text-on-surface/40">({BATTLE_FINISH_POINTS[b.finish]})</span>
                          </span>
                          <span className="text-on-surface/45">against</span>
                          <span className="font-medium">{b.opponentBeyblade ?? "Beyblade"}</span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {m.notes ? <p className="text-xs text-on-surface/55">{m.notes}</p> : null}
                  {editable ? <RowActions match={m} editHref={editHref} canApprove={canApprove} /> : null}
                </div>
              </details>
            ) : (
              <div className="group">
                {summary}
                {editable ? (
                  <div className="-mt-1 px-3 pb-2">
                    <RowActions match={m} editHref={editHref} canApprove={canApprove} />
                  </div>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RowActions({
  match,
  editHref,
  canApprove,
}: {
  match: LeagueMatchRow;
  editHref?: (m: LeagueMatchRow) => string;
  canApprove?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {canApprove && match.status === "pending" ? <MatchApproveButton matchId={match.id} /> : null}
      {editHref ? (
        <Link
          href={editHref(match)}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-on-surface/60 transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" /> Edit
        </Link>
      ) : null}
      <MatchDeleteButton matchId={match.id} />
    </div>
  );
}
