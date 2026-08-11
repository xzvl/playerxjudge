import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentParticipantsWorkspace } from "@/components/dashboard/organizer/TournamentParticipantsWorkspace";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentGroup, TournamentParticipant } from "@/lib/types/database";

export const metadata: Metadata = { title: "Participants", robots: { index: false, follow: false } };

export default async function TournamentParticipantsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/participants`);

  const tournament = await getManagedTournament(user.id, slug);
  const settings = tournament.format_settings;
  const isTwoStage = settings?.stageType === "two_stage";

  const supabase = await createClient();
  const [{ data: participants }, { data: groups }, { count: matchCount }] = await Promise.all([
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
    supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id),
  ]);
  // Once the group stage (or single-stage bracket) has generated its first
  // matches, removing a participant would orphan match history — the
  // roster's Remove icon locks at that point, same trigger the workspace
  // index page uses to switch from the Round 1 preview to real matches.
  const tournamentStarted = (matchCount ?? 0) > 0;

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Participants</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Manage the roster, seeding, and group assignments.</p>
      <div className="mt-8">
        <TournamentParticipantsWorkspace
          tournamentId={tournament.id}
          slug={tournament.slug}
          initialParticipants={(participants as TournamentParticipant[] | null) ?? []}
          initialGroups={(groups as TournamentGroup[] | null) ?? []}
          isTwoStage={isTwoStage}
          isTeam={tournament.battle_type !== "solo"}
          participantsPerGroup={isTwoStage ? settings.groupStage.participantsPerGroup : 8}
          tournamentStarted={tournamentStarted}
        />
      </div>
    </div>
  );
}
