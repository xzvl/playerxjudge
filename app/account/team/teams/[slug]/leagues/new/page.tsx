import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadTeamContext } from "@/app/account/team/data";
import { Panel } from "@/components/dashboard/erp";
import { LeagueForm } from "@/components/dashboard/team/LeagueForm";

export const metadata: Metadata = { title: "New League", robots: { index: false, follow: false } };

export default async function NewLeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team, isManager } = await loadTeamContext(slug);
  if (!isManager) redirect(`/account/team/teams/${slug}/leagues`);

  return (
    <Panel title="New league" className="max-w-2xl">
      <LeagueForm teamId={team.id} teamSlug={team.slug} />
    </Panel>
  );
}
