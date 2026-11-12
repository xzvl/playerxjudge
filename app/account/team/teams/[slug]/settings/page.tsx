import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImageIcon, Settings, TriangleAlert } from "lucide-react";

import { deleteTeam } from "@/app/account/team/actions";
import { loadTeamContext } from "@/app/account/team/data";
import { Panel } from "@/components/dashboard/erp";
import { TeamForm } from "@/components/dashboard/team/TeamForm";
import { TeamImageField } from "@/components/dashboard/team/TeamImageField";
import { DeleteTeamButton } from "@/components/dashboard/team/DeleteTeamButton";

export const metadata: Metadata = { title: "Team Settings", robots: { index: false, follow: false } };

export default async function TeamSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team, isManager, isOwner } = await loadTeamContext(slug);
  if (!isManager) redirect(`/account/team/teams/${slug}`);

  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Panel title="Team details" icon={Settings}>
        <TeamForm team={team} />
      </Panel>

      <div className="space-y-5">
        <Panel title="Team logo" icon={ImageIcon}>
          <TeamImageField teamId={team.id} kind="logo" initialUrl={team.logo_url} />
        </Panel>
        <Panel title="Cover image" icon={ImageIcon}>
          <TeamImageField teamId={team.id} kind="cover" initialUrl={team.cover_url} />
        </Panel>
        {isOwner ? (
          <Panel title="Danger zone" icon={TriangleAlert} className="border-primary/30">
            <p className="mb-3 text-[13px] text-on-surface/60">
              Deleting the team removes its members, leagues, rosters, matches and images. This can&apos;t be undone.
            </p>
            <DeleteTeamButton teamId={team.id} teamName={team.name} onDelete={deleteTeam} />
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
