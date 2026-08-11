import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentStationsPanel, type StationItem } from "@/components/dashboard/organizer/TournamentStationsPanel";
import type { ComboboxOption } from "@/components/ui/combobox";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { Match, TournamentParticipant, TournamentStation } from "@/lib/types/database";

export const metadata: Metadata = { title: "Stations", robots: { index: false, follow: false } };

export default async function StationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/stations`);

  const tournament = await getManagedTournament(user.id, slug);
  const supabase = await createClient();
  const [{ data: stationRows }, { data: participants }, { data: matches }] = await Promise.all([
    supabase.from("tournament_stations").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .in("status", ["scheduled", "ongoing"])
      .order("round"),
  ]);

  const participantsById = new Map(((participants as TournamentParticipant[] | null) ?? []).map((p) => [p.id, p]));
  const matchOptions: ComboboxOption[] = ((matches as Match[] | null) ?? [])
    .filter((m) => m.participant_a_id && m.participant_b_id)
    .map((m) => {
      const a = participantsById.get(m.participant_a_id!);
      const b = participantsById.get(m.participant_b_id!);
      const aLabel = a ? a.team_name ?? a.name : "TBD";
      const bLabel = b ? b.team_name ?? b.name : "TBD";
      return { value: m.id, label: `Round ${m.round} — ${aLabel} vs ${bLabel}` };
    });

  const stations: StationItem[] = ((stationRows as TournamentStation[] | null) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    currentMatchId: s.current_match_id,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Stations</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Physical play areas and which match is running where.</p>
      <div className="mt-8">
        <TournamentStationsPanel tournamentId={tournament.id} slug={tournament.slug} stations={stations} matchOptions={matchOptions} />
      </div>
    </div>
  );
}
