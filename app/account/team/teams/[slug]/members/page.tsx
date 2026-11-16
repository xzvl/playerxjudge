import type { Metadata } from "next";
import { Mail, UserPlus, Users } from "lucide-react";

import { loadTeamContext } from "@/app/account/team/data";
import { Panel } from "@/components/dashboard/erp";
import { InvitePlayerForm } from "@/components/dashboard/team/InvitePlayerForm";
import { PendingInvitesList } from "@/components/dashboard/team/InviteLists";
import { MembersTable } from "@/components/dashboard/team/MembersTable";
import { getPendingTeamInvites, getTeamMembers } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "Team Members", robots: { index: false, follow: false } };

export default async function TeamMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team, userId, role, isOwner, isManager } = await loadTeamContext(slug);
  const [members, invites] = await Promise.all([
    getTeamMembers(team.id),
    isManager ? getPendingTeamInvites(team.id) : Promise.resolve([]),
  ]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="Members" icon={Users} meta={members.length} bodyClassName="p-0">
        <MembersTable teamId={team.id} members={members} viewerId={userId} viewerRole={role} isOwner={isOwner} ownerId={team.owner_id} />
      </Panel>

      {isManager ? (
        <div className="space-y-5">
          <Panel title="Invite players" icon={UserPlus}>
            <InvitePlayerForm teamId={team.id} canAppointSubCaptain={isOwner || role === "captain"} />
          </Panel>
          <Panel title="Pending invites" icon={Mail} meta={invites.length}>
            <PendingInvitesList teamId={team.id} invites={invites} canManage={isManager} />
          </Panel>
        </div>
      ) : (
        <Panel title="Roles" icon={Users}>
          <dl className="space-y-2 text-[13px]">
            <div>
              <dt className="font-medium">Owner</dt>
              <dd className="text-on-surface/55">Full control of the team, including transferring ownership or deleting it.</dd>
            </div>
            <div>
              <dt className="font-medium">Team Captain</dt>
              <dd className="text-on-surface/55">Leads the team. Manages members, leagues and rosters.</dd>
            </div>
            <div>
              <dt className="font-medium">Sub Captain</dt>
              <dd className="text-on-surface/55">Helps manage members, leagues and rosters.</dd>
            </div>
            <div>
              <dt className="font-medium">Member</dt>
              <dd className="text-on-surface/55">Plays for the team and logs their own league matches.</dd>
            </div>
            <div>
              <dt className="font-medium">Filler</dt>
              <dd className="text-on-surface/55">Plays when the team is short. Logs their own matches too.</dd>
            </div>
          </dl>
        </Panel>
      )}
    </div>
  );
}
