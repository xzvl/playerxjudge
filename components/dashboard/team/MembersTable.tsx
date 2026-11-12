"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, LogOut, MoreHorizontal, UserMinus } from "lucide-react";

import { removeTeamMember, setMemberRole, transferCaptaincy } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmActionButton } from "@/components/dashboard/team/ConfirmActionButton";
import { PlayerCell, RoleBadge } from "@/components/dashboard/team/team-ui";
import { ASSIGNABLE_TEAM_ROLES, TEAM_ROLE_LABEL } from "@/lib/teams/constants";
import type { TeamMemberRow } from "@/lib/teams/queries";
import type { TeamRole } from "@/lib/types/database";

const joinedFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function MembersTable({
  teamId,
  members,
  viewerId,
  viewerRole,
  isOwner,
}: {
  teamId: string;
  members: TeamMemberRow[];
  viewerId: string;
  viewerRole: TeamRole | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "captain"; member: TeamMemberRow } | null>(null);
  const [, startTransition] = useTransition();
  const isManager = isOwner || viewerRole === "captain" || viewerRole === "sub_captain";

  const changeRole = (profileId: string, role: TeamRole) =>
    startTransition(async () => {
      setError(null);
      const result = await setMemberRole(teamId, profileId, role);
      if (result.status === "error") setError(result.message ?? "Couldn't change the role.");
      else router.refresh();
    });

  // What the viewer may do to a given row (mirrors the server rules).
  const canEditRole = (m: TeamMemberRow) =>
    isManager && m.role !== "captain" && m.profile.id !== viewerId && (isOwner || m.role !== "sub_captain");
  const canRemove = (m: TeamMemberRow) => canEditRole(m);

  return (
    <div className="space-y-2">
      {error ? <p className="text-[13px] text-primary">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-outline-variant/20">
              <th className="px-3">Player</th>
              <th className="px-3">Role</th>
              <th className="hidden px-3 sm:table-cell">Joined</th>
              <th className="w-10 px-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.profile.id === viewerId;
              const assignable = ASSIGNABLE_TEAM_ROLES.filter((r) => r !== m.role && (isOwner || r !== "sub_captain"));
              return (
                <tr key={m.profile.id} className="border-b border-outline-variant/15 last:border-0">
                  <td className="px-3">
                    <PlayerCell profile={m.profile} sub={isSelf ? `@${m.profile.username} · you` : undefined} />
                  </td>
                  <td className="px-3">
                    <RoleBadge role={m.role} />
                  </td>
                  <td className="hidden px-3 text-on-surface/55 sm:table-cell">{joinedFmt.format(new Date(m.joinedAt))}</td>
                  <td className="px-3 text-right">
                    {canEditRole(m) || (isOwner && !isSelf) ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="erp:h-7 erp:w-7" aria-label={`Manage ${m.profile.displayName}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canEditRole(m) && assignable.length > 0 ? (
                            <>
                              <DropdownMenuLabel>Change role</DropdownMenuLabel>
                              {assignable.map((r) => (
                                <DropdownMenuItem key={r} onSelect={() => changeRole(m.profile.id, r)}>
                                  {TEAM_ROLE_LABEL[r]}
                                </DropdownMenuItem>
                              ))}
                            </>
                          ) : null}
                          {isOwner && !isSelf ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setConfirm({ kind: "captain", member: m })}>
                                <Crown className="h-3.5 w-3.5" /> Make team captain
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {canRemove(m) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-primary erp:focus:text-primary"
                                onSelect={() => setConfirm({ kind: "remove", member: m })}
                              >
                                <UserMinus className="h-3.5 w-3.5" /> Remove from team
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : isSelf && m.role !== "captain" ? (
                      <ConfirmActionButton
                        title="Leave this team?"
                        description="You'll be taken off its league rosters. Your logged matches stay in the league history."
                        confirmLabel="Leave team"
                        variant="ghost"
                        onConfirm={() => removeTeamMember(teamId, viewerId)}
                        onDone={() => router.push("/account/team/teams")}
                      >
                        <LogOut /> Leave
                      </ConfirmActionButton>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Controlled confirm for the dropdown actions (a dropdown item can't
          host its own dialog trigger cleanly). */}
      {confirm ? (
        <ControlledConfirm
          key={`${confirm.kind}-${confirm.member.profile.id}`}
          title={confirm.kind === "captain" ? `Make ${confirm.member.profile.displayName} captain?` : `Remove ${confirm.member.profile.displayName}?`}
          description={
            confirm.kind === "captain"
              ? "They become the team captain and owner. You become a sub-captain."
              : "They'll be taken off the team and its league rosters. Their logged matches stay."
          }
          confirmLabel={confirm.kind === "captain" ? "Transfer captaincy" : "Remove"}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            confirm.kind === "captain"
              ? transferCaptaincy(teamId, confirm.member.profile.id)
              : removeTeamMember(teamId, confirm.member.profile.id)
          }
          onDone={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function ControlledConfirm({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  onDone,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<{ status: "success" | "error"; message?: string }>;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? <p className="px-5 text-[13px] text-primary">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (result.status === "error") return setError(result.message ?? "Something went wrong.");
                onClose();
                onDone();
              })
            }
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
