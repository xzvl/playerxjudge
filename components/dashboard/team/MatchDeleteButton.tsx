"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteLeagueMatch } from "@/app/account/team/actions";
import { ConfirmActionButton } from "@/components/dashboard/team/ConfirmActionButton";

export function MatchDeleteButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  return (
    <ConfirmActionButton
      title="Delete this match?"
      description="It's removed from the standings and match history, with its battles."
      confirmLabel="Delete"
      variant="ghost"
      className="erp:h-7 erp:px-2 erp:text-xs erp:text-on-surface/60"
      onConfirm={() => deleteLeagueMatch(matchId)}
      onDone={() => router.refresh()}
    >
      <Trash2 /> Delete
    </ConfirmActionButton>
  );
}
