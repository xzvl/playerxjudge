import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/dashboard/erp";
import { RoleBadge, TeamLogo } from "@/components/dashboard/team/team-ui";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getMyTeams } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "Teams", robots: { index: false, follow: false } };

export default async function TeamsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/team/teams");
  const teams = await getMyTeams(user.id);

  const newTeamButton = (
    <Button asChild size="sm">
      <Link href="/account/team/teams/new">
        <Plus /> New team
      </Link>
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Team Dashboard" title="Teams" description="Teams you captain or play for." actions={newTeamButton} />

      {teams.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No teams yet"
          description="Create a team to invite players, run leagues and track standings."
          action={newTeamButton}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/account/team/teams/${t.slug}`}
              className="group overflow-hidden rounded-lg border border-outline-variant/25 bg-surface-container-low transition-colors hover:border-outline-variant/50"
            >
              <div className="h-16 bg-surface-container">
                {t.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.cover_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex items-start gap-3 px-4 pb-4">
                <TeamLogo name={t.name} logoUrl={t.logo_url} size="lg" className="-mt-6 bg-surface-container-low" />
                <div className="min-w-0 flex-1 pt-2">
                  <p className="truncate text-[13px] font-semibold">
                    {t.name}
                    {t.tag ? <span className="ml-1.5 font-mono text-xs font-normal text-on-surface/45">{t.tag}</span> : null}
                  </p>
                  <p className="text-xs text-on-surface/45">
                    {t.memberCount} member{t.memberCount === 1 ? "" : "s"} · {t.leagueCount} league{t.leagueCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="pt-2">{t.myRole ? <RoleBadge role={t.myRole} /> : null}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
