"use client";

import { useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { cancelTeamInvite, respondToTeamInvite } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { PlayerCell, RoleBadge, TeamLogo } from "@/components/dashboard/team/team-ui";
import type { MyInviteRow, TeamInviteRow } from "@/lib/teams/queries";

const sentFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

// Outgoing: a team's pending invites (managers can cancel).
export function PendingInvitesList({ teamId, invites, canManage }: { teamId: string; invites: TeamInviteRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useBusyTransition();

  if (invites.length === 0) return <p className="text-[13px] text-on-surface/50">No pending invites.</p>;

  return (
    <div className="space-y-2">
      {error ? <p className="text-[13px] text-primary">{error}</p> : null}
      <ul className="divide-y divide-outline-variant/15">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <PlayerCell
              profile={invite.invitee}
              sub={`Sent ${sentFmt.format(new Date(invite.createdAt))}${invite.invitedBy ? ` by ${invite.invitedBy.displayName}` : ""}`}
            />
            <div className="flex shrink-0 items-center gap-2">
              <RoleBadge role={invite.role} />
              {canManage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === invite.id}
                  onClick={() => {
                    setBusy(invite.id);
                    startTransition(async () => {
                      const result = await cancelTeamInvite(teamId, invite.id);
                      setBusy(null);
                      if (result.status === "error") setError(result.message ?? "Couldn't cancel.");
                      else router.refresh();
                    });
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Incoming: invites addressed to the signed-in player.
export function MyInvitesList({ invites }: { invites: MyInviteRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useBusyTransition();

  const respond = (id: string, accept: boolean) => {
    setBusy(id);
    startTransition(async () => {
      const result = await respondToTeamInvite(id, accept);
      setBusy(null);
      if (result.status === "error") return setError(result.message ?? "Something went wrong.");
      if (accept && result.slug) router.push(`/account/team/teams/${result.slug}`);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      {error ? <p className="text-[13px] text-primary">{error}</p> : null}
      <ul className="divide-y divide-outline-variant/15">
        {invites.map((invite) => (
          <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <TeamLogo name={invite.team.name} logoUrl={invite.team.logo_url} size="sm" />
              <div className="min-w-0">
                <Link href={`/teams/${invite.team.slug}`} className="block truncate text-[13px] font-medium hover:underline">
                  {invite.team.name}
                  {invite.team.tag ? <span className="ml-1.5 font-mono text-xs text-on-surface/45">{invite.team.tag}</span> : null}
                </Link>
                <p className="truncate text-xs text-on-surface/45">
                  {invite.invitedBy ? `From ${invite.invitedBy.displayName} · ` : ""}
                  {sentFmt.format(new Date(invite.createdAt))}
                </p>
              </div>
              <RoleBadge role={invite.role} />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" disabled={busy === invite.id} onClick={() => respond(invite.id, false)}>
                <X /> Decline
              </Button>
              <Button size="sm" disabled={busy === invite.id} onClick={() => respond(invite.id, true)}>
                <Check /> Accept
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
