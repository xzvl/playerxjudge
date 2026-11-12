import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { loadTeamContext } from "@/app/account/team/data";
import { TeamSubNav } from "@/components/dashboard/team/TeamSubNav";
import { ExternalPageLink, RoleBadge, TeamLogo } from "@/components/dashboard/team/team-ui";

export default async function TeamWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { team, role, isManager } = await loadTeamContext(slug);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/account/team/teams"
          className="mb-3 inline-flex items-center gap-1 text-xs text-on-surface/50 transition-colors hover:text-on-surface"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Teams
        </Link>

        {team.cover_url ? (
          <div className="mb-4 h-24 overflow-hidden rounded-lg border border-outline-variant/20 sm:h-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.cover_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo name={team.name} logoUrl={team.logo_url} size="lg" />
            <div className="min-w-0">
              <h1 className="heading flex items-center gap-2 truncate">
                {team.name}
                {team.tag ? <span className="font-mono text-sm font-normal text-on-surface/45">{team.tag}</span> : null}
              </h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-on-surface/45">
                {role ? <RoleBadge role={role} /> : null}
                <span className="font-mono">/teams/{team.slug}</span>
              </div>
            </div>
          </div>
          <ExternalPageLink href={`/teams/${team.slug}`} />
        </div>

        <TeamSubNav slug={team.slug} isManager={isManager} />
      </div>

      {children}
    </div>
  );
}
