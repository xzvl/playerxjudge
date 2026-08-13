import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentStationsPanel, type StationItem, type JudgeItem, type AvailableJudge } from "@/components/dashboard/organizer/TournamentStationsPanel";
import type { ComboboxOption } from "@/components/ui/combobox";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { Judge, Match, TournamentParticipant, TournamentStation } from "@/lib/types/database";

export const metadata: Metadata = { title: "Stations", robots: { index: false, follow: false } };

export default async function StationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/stations`);

  const tournament = await getManagedTournament(user.id, slug);
  const supabase = await createClient();
  const [{ data: stationRows }, { data: participants }, { data: matches }, { data: judgeRows }] = await Promise.all([
    supabase.from("tournament_stations").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .in("status", ["scheduled", "ongoing"])
      .order("round"),
    supabase.from("judges").select("*, profiles(display_name, avatar_url)").eq("tournament_id", tournament.id).order("assigned_at"),
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

  type JudgeRowWithProfile = Judge & { profiles: { display_name: string; avatar_url: string | null } | null };
  const judgeRowsTyped = (judgeRows as JudgeRowWithProfile[] | null) ?? [];
  const judges: JudgeItem[] = judgeRowsTyped.map((j) => ({
    id: j.id,
    judgeId: j.judge_id,
    name: j.profiles?.display_name ?? "Unknown Judge",
    avatarUrl: j.profiles?.avatar_url ?? null,
    status: j.status,
    stationId: j.station_id,
  }));

  // "Available" = every approved judge not already on this tournament's
  // roster (any status) — the pool the Add Judge search picks from.
  const alreadyAdded = new Set(judgeRowsTyped.map((j) => j.judge_id));
  // `profiles!profile_roles_profile_id_fkey` disambiguates the embed —
  // profile_roles has two FKs into profiles (profile_id and decided_by), so
  // the bare `profiles(...)` shorthand is rejected as ambiguous (PGRST201).
  const { data: approvedJudgeRoles } = await supabase
    .from("profile_roles")
    .select("profile_id, profiles!profile_roles_profile_id_fkey(display_name, username)")
    .eq("role", "judge")
    .eq("status", "approved");
  const availableJudges: AvailableJudge[] = (
    (approvedJudgeRoles as { profile_id: string; profiles: { display_name: string; username: string } | null }[] | null) ?? []
  )
    .filter((r) => !alreadyAdded.has(r.profile_id))
    .map((r) => ({ id: r.profile_id, displayName: r.profiles?.display_name ?? "Unknown Judge", username: r.profiles?.username ?? "" }));

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Stations</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Physical play areas and which match is running where.</p>
      <div className="mt-8">
        <TournamentStationsPanel
          tournamentId={tournament.id}
          tournamentTitle={tournament.title}
          slug={tournament.slug}
          stations={stations}
          matchOptions={matchOptions}
          judges={judges}
          availableJudges={availableJudges}
        />
      </div>
    </div>
  );
}
