import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TournamentSubNav } from "@/components/dashboard/organizer/TournamentSubNav";
import { TournamentStatusBadge } from "@/components/dashboard/organizer/badges";
import { getManagedTournamentForStaff } from "@/app/account/organizer/tournament/[slug]/data";

// Staff-only gate for the whole /backend/tournaments/[slug] tree is
// already enforced one level up by app/backend/layout.tsx (which wraps
// every route under /backend) — nothing further to check here, same as
// the flat /backend/tournaments list page.
export default async function BackendTournamentWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await getManagedTournamentForStaff(slug);
  const baseHref = `/backend/tournaments/${tournament.slug}`;

  return (
    <div>
      <Link href="/backend/tournaments" className="label-mono flex items-center gap-1.5 text-on-surface/50 hover:text-primary">
        <ArrowLeft className="h-3.5 w-3.5" /> All Tournaments
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="heading text-2xl">{tournament.title}</h1>
        <TournamentStatusBadge status={tournament.status} />
      </div>
      <p className="mt-1 text-sm text-on-surface/50">/tournaments/{tournament.slug}</p>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <TournamentSubNav baseHref={baseHref} isTwoStage={tournament.format_settings?.stageType === "two_stage"} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
