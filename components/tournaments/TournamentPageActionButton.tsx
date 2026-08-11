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
}: {
  tournament: MockTournament;
  hasStarted: boolean;
  completed: boolean;
}) {
  const [preRegisterOpen, setPreRegisterOpen] = useState(false);
  const actionLabel = completed ? "View Result" : hasStarted ? "Go Shoot!" : "Register Now";
  const actionTooltip = completed ? "See the final results" : hasStarted ? "Watch this tournament live" : "Register for this tournament";

  if (hasStarted) {
    return (
      <Button asChild size="lg" className="w-full" tooltip={actionTooltip}>
        <Link href={`/tournaments/${tournament.slug}/player`}>{actionLabel}</Link>
      </Button>
    );
  }

  return (
    <>
      <Button size="lg" className="w-full" tooltip={actionTooltip} onClick={() => setPreRegisterOpen(true)}>
        {actionLabel}
      </Button>
      <PreRegisterDialog tournament={tournament} open={preRegisterOpen} onOpenChange={setPreRegisterOpen} />
    </>
  );
}
