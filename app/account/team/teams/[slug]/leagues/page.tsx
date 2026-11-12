import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";

import { loadTeamContext } from "@/app/account/team/data";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/erp";
import { DateRange, LeagueStatusBadge } from "@/components/dashboard/team/team-ui";
import { getTeamLeagues } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "Team Leagues", robots: { index: false, follow: false } };

export default async function TeamLeaguesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team, isManager } = await loadTeamContext(slug);
  const leagues = await getTeamLeagues(team.id);
  const base = `/account/team/teams/${team.slug}/leagues`;

  const newButton = isManager ? (
    <Button asChild size="sm">
      <Link href={`${base}/new`}>
        <Plus /> New league
      </Link>
    </Button>
  ) : null;

  if (leagues.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No leagues yet"
        description={isManager ? "Create a league with its dates and elite player count." : "The captain hasn't added a league yet."}
        action={newButton}
      />
    );
  }

  return (
    <div className="space-y-3">
      {newButton ? <div className="flex justify-end">{newButton}</div> : null}
      <div className="overflow-x-auto rounded-lg border border-outline-variant/25 bg-surface-container-low">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-outline-variant/20">
              <th className="px-4">League</th>
              <th className="hidden px-4 md:table-cell">Dates</th>
              <th className="px-4">Status</th>
              <th className="px-4 text-right">Elite</th>
              <th className="hidden px-4 text-right sm:table-cell">Roster</th>
              <th className="hidden px-4 text-right sm:table-cell">Matches</th>
            </tr>
          </thead>
          <tbody>
            {leagues.map((l) => (
              <tr key={l.id} className="border-b border-outline-variant/15 last:border-0">
                <td className="px-4">
                  <Link href={`${base}/${l.id}`} className="font-medium hover:underline">
                    {l.name}
                  </Link>
                </td>
                <td className="hidden whitespace-nowrap px-4 text-on-surface/60 md:table-cell">
                  <DateRange start={l.start_date} end={l.end_date} />
                </td>
                <td className="px-4">
                  <LeagueStatusBadge status={l.status} />
                </td>
                <td className="px-4 text-right tabular-nums">{l.elite_count}</td>
                <td className="hidden px-4 text-right tabular-nums sm:table-cell">{l.rosterCount}</td>
                <td className="hidden px-4 text-right tabular-nums sm:table-cell">{l.matchCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
