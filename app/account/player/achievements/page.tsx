import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AchievementsGrid } from "@/components/dashboard/player/AchievementsGrid";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { computeBirdKing, fetchLinkedTournaments, fetchPlayerMatches } from "@/lib/player/linked-participants";
import { computeAchievements } from "@/lib/player/achievements";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Achievements", robots: { index: false, follow: false } };

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/achievements");

  const supabase = await createClient();
  const linked = await fetchLinkedTournaments(supabase, user.id);
  const [matches, birdKing] = await Promise.all([fetchPlayerMatches(supabase, linked), computeBirdKing(supabase, linked)]);
  const achievements = computeAchievements(matches, linked, birdKing);

  return (
    <div>
      <PageHeader
        eyebrow="Player Dashboard"
        title="Achievements"
        description="Unlocked achievements glow in their color — keep battling to light up the rest."
      />
      <div className="mt-5">
        <AchievementsGrid achievements={achievements} />
      </div>
    </div>
  );
}
