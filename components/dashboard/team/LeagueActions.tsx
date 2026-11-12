"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { deleteLeague } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmActionButton } from "@/components/dashboard/team/ConfirmActionButton";
import { LeagueForm } from "@/components/dashboard/team/LeagueForm";
import type { TeamLeague } from "@/lib/types/database";

export function LeagueManageActions({ teamId, teamSlug, league }: { teamId: string; teamSlug: string; league: TeamLeague }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil /> Edit
      </Button>
      <ConfirmActionButton
        title={`Delete ${league.name}?`}
        description="Its roster, matches, battles and standings are removed for good."
        confirmLabel="Delete league"
        variant="ghost"
        onConfirm={() => deleteLeague(league.id)}
        onDone={() => router.push(`/account/team/teams/${teamSlug}/leagues`)}
      >
        <Trash2 /> Delete
      </ConfirmActionButton>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit league</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5">
            <LeagueForm teamId={teamId} teamSlug={teamSlug} league={league} onSaved={() => setEditing(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
