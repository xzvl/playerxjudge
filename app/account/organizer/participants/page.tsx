import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ParticipantsPanel, type ParticipantRow } from "@/components/dashboard/organizer/ParticipantsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Tournament, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

export const metadata: Metadata = { title: "Participants", robots: { index: false, follow: false } };

export default async function ParticipantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/participants");

  const supabase = await createClient();
  const { data: tournamentRows } = await supabase
    .from("tournaments")
    .select("id, title")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });
  const tournaments = (tournamentRows as Pick<Tournament, "id" | "title">[] | null) ?? [];
  const tournamentIds = tournaments.map((t) => t.id);

  let participants: ParticipantRow[] = [];
  if (tournamentIds.length > 0) {
    const [{ data: participantRows }, { data: groupRows }] = await Promise.all([
      supabase.from("tournament_participants").select("*").in("tournament_id", tournamentIds).order("created_at", { ascending: false }),
      supabase.from("tournament_groups").select("id, label").in("tournament_id", tournamentIds),
    ]);

    const tournamentTitleById = new Map(tournaments.map((t) => [t.id, t.title]));
    const groupLabelById = new Map(
      ((groupRows as Pick<TournamentGroup, "id" | "label">[] | null) ?? []).map((g) => [g.id, g.label])
    );

    participants = ((participantRows as TournamentParticipant[] | null) ?? []).map((p) => ({
      id: p.id,
      playerName: p.name,
      teamName: p.team_name,
      tournamentId: p.tournament_id,
      tournamentTitle: tournamentTitleById.get(p.tournament_id) ?? "Unknown Tournament",
      seed: p.seed,
      groupLabel: p.group_id ? (groupLabelById.get(p.group_id) ?? null) : null,
      registeredAt: p.created_at,
    }));
  }

  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Participants</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Everyone registered across your tournaments.</p>
      <div className="mt-8">
        <ParticipantsPanel tournaments={tournaments} participants={participants} />
      </div>
    </div>
  );
}
