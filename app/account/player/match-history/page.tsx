import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MatchHistoryPanel } from "@/components/dashboard/player/MatchHistoryPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { fetchLinkedTournaments, fetchPlayerMatches } from "@/lib/player/linked-participants";

export const metadata: Metadata = { title: "Match History", robots: { index: false, follow: false } };

export default async function MatchHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/match-history");

  const supabase = await createClient();
  const linked = await fetchLinkedTournaments(supabase, user.id);
  const matches = await fetchPlayerMatches(supabase, linked);

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Match History</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every match you&apos;ve played — won or lost.</p>
      <div className="mt-8">
        <MatchHistoryPanel matches={matches} />
      </div>
    </div>
  );
}
