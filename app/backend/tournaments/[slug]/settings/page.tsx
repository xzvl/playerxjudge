import type { Metadata } from "next";

import { TournamentSettingsPanel } from "@/components/dashboard/organizer/TournamentSettingsPanel";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournamentForStaff } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentPrize } from "@/lib/types/database";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Settings — ${slug}`, robots: { index: false, follow: false } };
}

export default async function BackendTournamentSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getManagedTournamentForStaff(slug);

  const supabase = await createClient();
  // Unlike the organizer's own Settings page, this isn't scoped to
  // `owner_id` — staff managing someone else's tournament need the full
  // community list to choose from, not just their own.
  const [{ data: communities }, { data: prizes }, { count: matchCount }] = await Promise.all([
    supabase.from("communities").select("id, name").order("name"),
    supabase.from("tournament_prizes").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
  ]);
  const groupStageStarted = (matchCount ?? 0) > 0;

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h2 className="heading mt-2 text-2xl">Settings</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Edit the details players see.</p>
      <div className="mt-8">
        <TournamentSettingsPanel
          tournament={tournament}
          communities={communities ?? []}
          prizes={(prizes as TournamentPrize[] | null) ?? []}
          groupStageStarted={groupStageStarted}
          basePath="/backend/tournaments"
        />
      </div>
    </div>
  );
}
