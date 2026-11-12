import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MatchHistoryPanel } from "@/components/dashboard/player/MatchHistoryPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { fetchLinkedTournaments, fetchPlayerMatches } from "@/lib/player/linked-participants";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Match History", robots: { index: false, follow: false } };

export default async function MatchHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/match-history");

  const supabase = await createClient();
  const linked = await fetchLinkedTournaments(supabase, user.id);
  const matches = await fetchPlayerMatches(supabase, linked);

  return (
    <div>
      <PageHeader
        eyebrow="Player Dashboard"
        title="Match History"
        description={<>Every match you&apos;ve played — won or lost.</>}
      />
      <div className="mt-5">
        <MatchHistoryPanel matches={matches} />
      </div>
    </div>
  );
}
