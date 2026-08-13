"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PreRegisterDialog } from "@/components/tournaments/PreRegisterDialog";
import type { MockTournament } from "@/lib/mock/tournaments";

// The sidebar action button on /tournaments/[slug] — pulled out into its own
// client component since the page itself is a Server Component but
// pre-registering needs local dialog state. Same three states as the
// homepage quick-look popup's action button.
export function TournamentPageActionButton({
  tournament,
  hasStarted,
  completed,
  canJudge,
}: {
  tournament: MockTournament;
  hasStarted: boolean;
  completed: boolean;
  // Whether the signed-in visitor is this tournament's organizer or one of
  // its approved judges (see canJudgeTournament in app/tournaments/[slug]/page.tsx)
  // — shows a second "Judge Scoring!" button straight to their console.
  canJudge: boolean;
}) {
  const [preRegisterOpen, setPreRegisterOpen] = useState(false);
  const actionLabel = completed ? "View Result" : hasStarted ? "Go Shoot!" : "Register Now";
  const actionTooltip = completed ? "See the final results" : hasStarted ? "Watch this tournament live" : "Register for this tournament";

  const judgeButton = canJudge ? (
    <Button asChild size="lg" variant="outline" className="mt-3 w-full" tooltip="Open the judge scoring console for this tournament">
      <Link href={`/tournaments/${tournament.slug}/judge`}>Judge Scoring!</Link>
    </Button>
  ) : null;

  if (hasStarted) {
    return (
      <>
        <Button asChild size="lg" className="w-full" tooltip={actionTooltip}>
          <Link href={`/tournaments/${tournament.slug}/player`}>{actionLabel}</Link>
        </Button>
        {judgeButton}
      </>
    );
  }

  return (
    <>
      <Button size="lg" className="w-full" tooltip={actionTooltip} onClick={() => setPreRegisterOpen(true)}>
        {actionLabel}
      </Button>
      {judgeButton}
      <PreRegisterDialog tournament={tournament} open={preRegisterOpen} onOpenChange={setPreRegisterOpen} />
    </>
  );
}
