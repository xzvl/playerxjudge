import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentSettingsPanel } from "@/components/dashboard/organizer/TournamentSettingsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentPrize } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard/erp";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Settings — ${slug}`, robots: { index: false, follow: false } };
}

export default async function TournamentSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/settings`);

  const tournament = await getManagedTournament(user.id, slug);

  const supabase = await createClient();
  const [{ data: communities }, { data: prizes }, { count: matchCount }] = await Promise.all([
    supabase.from("communities").select("id, name").eq("owner_id", user.id).order("name"),
    supabase.from("tournament_prizes").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
  ]);
  // Once the group stage has generated its first matches, a narrower set of
  // fields (slug, single/two-stage toggle, group format, the three schedule
  // dates, group tie breaks) locks — see TournamentSettingsPanel.
  const groupStageStarted = (matchCount ?? 0) > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Tournament Management"
        title="Settings"
        description="Edit the details players see."
        as="h2"
      />
      <div className="mt-5">
        <TournamentSettingsPanel
          tournament={tournament}
          communities={communities ?? []}
          prizes={(prizes as TournamentPrize[] | null) ?? []}
          groupStageStarted={groupStageStarted}
        />
      </div>
    </div>
  );
}
