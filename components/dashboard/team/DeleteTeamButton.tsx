"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { ConfirmActionButton } from "@/components/dashboard/team/ConfirmActionButton";
import type { TeamActionState } from "@/app/account/team/actions";

export function DeleteTeamButton({
  teamId,
  teamName,
  onDelete,
}: {
  teamId: string;
  teamName: string;
  onDelete: (teamId: string) => Promise<TeamActionState>;
}) {
  const router = useRouter();
  return (
    <ConfirmActionButton
      title={`Delete ${teamName}?`}
      description="Members, leagues, rosters, matches and images are removed for good."
      confirmLabel="Delete team"
      variant="destructive"
      onConfirm={() => onDelete(teamId)}
      onDone={() => router.push("/account/team/teams")}
    >
      <Trash2 /> Delete team
    </ConfirmActionButton>
  );
}
