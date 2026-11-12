import { PlayerCell, ResultPill } from "@/components/dashboard/team/team-ui";
import type { ProfileSummary } from "@/lib/teams/queries";
import type { StandingsRow } from "@/lib/teams/standings";
import { cn } from "@/lib/utils";

const COLUMNS: { key: string; label: string; title: string; className?: string }[] = [
  { key: "wlt", label: "W-L-T", title: "Wins - Losses - Ties" },
  { key: "score", label: "Score", title: "Match score: 3 per win, 1 per tie" },
  { key: "diff", label: "Pts diff", title: "Points scored minus points conceded" },
  { key: "pts", label: "Pts", title: "Points scored" },
  { key: "buchholz", label: "Buchholz", title: "Sum of your opponents' scores in this league", className: "hidden md:table-cell" },
  {
    key: "tb",
    label: "TB",
    title: "Tiebreak (Sonneborn-Berger): opponents' scores over your wins, plus half over your ties",
    className: "hidden md:table-cell",
  },
];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function StandingsTable({
  rows,
  profiles,
  slotById,
  matchHistoryHref,
}: {
  rows: StandingsRow[];
  profiles: Map<string, ProfileSummary> | Record<string, ProfileSummary>;
  // Optional elite/sub marker per player.
  slotById?: Record<string, "elite" | "sub">;
  // Builds a link to a player's match history, if the page has one.
  matchHistoryHref?: (profileId: string) => string;
}) {
  const get = (id: string) => (profiles instanceof Map ? profiles.get(id) : profiles[id]);

  if (rows.length === 0) return <p className="text-[13px] text-on-surface/50">No players on the roster yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-outline-variant/20">
            <th className="w-10 px-3 text-right">#</th>
            <th className="px-3">Player</th>
            {COLUMNS.map((c) => (
              <th key={c.key} title={c.title} className={cn("px-3 text-right", c.className)}>
                <span className="cursor-help underline decoration-dotted decoration-on-surface/25 underline-offset-2">{c.label}</span>
              </th>
            ))}
            <th className="hidden px-3 lg:table-cell">Last 5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const profile = get(r.profileId);
            const slot = slotById?.[r.profileId];
            return (
              <tr key={r.profileId} className="border-b border-outline-variant/15 last:border-0">
                <td className="px-3 text-right tabular-nums text-on-surface/55">{r.rank}</td>
                <td className="px-3">
                  {profile ? (
                    <PlayerCell
                      profile={profile}
                      sub={
                        <>
                          {slot ? (
                            <span className={cn("mr-1.5 font-medium", slot === "elite" ? "text-amber-500" : "text-on-surface/50")}>
                              {slot === "elite" ? "Elite" : "Sub"}
                            </span>
                          ) : null}
                          {matchHistoryHref && r.played > 0 ? (
                            <a href={matchHistoryHref(r.profileId)} className="hover:text-on-surface hover:underline">
                              {r.played} match{r.played === 1 ? "" : "es"}
                            </a>
                          ) : (
                            `${r.played} match${r.played === 1 ? "" : "es"}`
                          )}
                        </>
                      }
                    />
                  ) : (
                    r.name
                  )}
                </td>
                <td className="px-3 text-right tabular-nums">
                  {r.wins}-{r.losses}-{r.ties}
                </td>
                <td className="px-3 text-right font-semibold tabular-nums">{r.score}</td>
                <td
                  className={cn(
                    "px-3 text-right tabular-nums",
                    r.pointsDiff > 0 && "text-emerald-500",
                    r.pointsDiff < 0 && "text-primary"
                  )}
                >
                  {r.pointsDiff > 0 ? `+${r.pointsDiff}` : r.pointsDiff}
                </td>
                <td className="px-3 text-right tabular-nums">{r.points}</td>
                <td className="hidden px-3 text-right tabular-nums md:table-cell">{fmt(r.buchholz)}</td>
                <td className="hidden px-3 text-right tabular-nums md:table-cell">{fmt(r.tiebreak)}</td>
                <td className="hidden px-3 lg:table-cell">
                  <span className="flex gap-0.5">
                    {r.form.slice(-5).map((res, i) => (
                      <ResultPill key={i} result={res} />
                    ))}
                    {r.form.length === 0 ? <span className="text-on-surface/35">—</span> : null}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
