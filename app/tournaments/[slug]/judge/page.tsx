import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { JudgeConsole, type JudgeMatchContext, type JudgeMatchLite } from "@/components/tournaments/judge/JudgeConsole";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Judge, Match, TournamentGroup, TournamentParticipant, TournamentStation } from "@/lib/types/database";

// Same "not draft/cancelled" gate the rest of the public tournament pages
// use (see app/tournaments/[slug]/player/data.ts) — access itself is
// stricter than that page, though: sign-in plus either an approved judge
// row for this tournament or being its organizer.
const PUBLIC_STATUS_EXCLUDES = ["draft", "cancelled"] as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("tournaments").select("title").eq("slug", slug).maybeSingle();
  return { title: data ? `Judge — ${data.title}` : "Judge" };
}

export default async function TournamentJudgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/tournaments/${slug}/judge`);

  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, title, organizer_id, organizer_station_id")
    .eq("slug", slug)
    .not("status", "in", `(${PUBLIC_STATUS_EXCLUDES.join(",")})`)
    .maybeSingle();
  if (!tournament) notFound();

  const isOrganizer = tournament.organizer_id === user.id;

  const { data: judgeRow } = await supabase
    .from("judges")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("judge_id", user.id)
    .maybeSingle();
  const judge = judgeRow as Judge | null;
  const isConfirmedJudge = judge?.status === "approved";

  if (!isOrganizer && !isConfirmedJudge) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="label-mono text-primary">Judge Console</p>
        <h1 className="heading mt-2 text-2xl">{tournament.title}</h1>
        <p className="mt-4 text-sm text-on-surface/60">
          {!judge
            ? "You haven't been invited to judge this tournament."
            : judge.status === "pending"
              ? "Your invitation to judge this tournament is still pending — accept it from your notifications."
              : "You're not currently authorized to judge this tournament."}
        </p>
      </div>
    );
  }

  const [{ data: profile }, { data: participantRows }, { data: groupRows }, { data: matchRows }, { data: stationRows }] = await Promise.all([
    supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
    supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id),
    supabase.from("matches").select("*").eq("tournament_id", tournament.id).neq("status", "completed"),
    supabase.from("tournament_stations").select("*").eq("tournament_id", tournament.id).order("sort_order"),
  ]);

  const groups = ((groupRows as TournamentGroup[] | null) ?? []).map((g) => ({ id: g.id, label: g.label }));
  const matches: JudgeMatchLite[] = ((matchRows as Match[] | null) ?? []).map((m) => ({
    id: m.id,
    round: m.round,
    matchNumber: m.match_number,
    groupId: m.group_id,
    participantAId: m.participant_a_id,
    participantBId: m.participant_b_id,
  }));

  // Only participants with an active (unscored) match belong in the
  // pickers — the roster overall is much bigger than whoever's actually
  // mid-match right now, and a completed match's players drop out here the
  // moment the judge submits (matches above already excludes "completed").
  const activeParticipantIds = new Set(matches.flatMap((m) => [m.participantAId, m.participantBId].filter((id): id is string => id !== null)));
  const participants = ((participantRows as TournamentParticipant[] | null) ?? [])
    .filter((p) => activeParticipantIds.has(p.id))
    .map((p) => ({ id: p.id, displayName: p.team_name ?? p.name }));

  const stations = ((stationRows as TournamentStation[] | null) ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    currentMatchId: s.current_match_id,
  }));

  // Whoever's running the console can claim their own station (see
  // setOwnStation) — a judge's pick lives on their `judges` row, the
  // organizer's on the tournament itself, since they have no `judges` row.
  const currentStationId = isOrganizer ? tournament.organizer_station_id : judge?.station_id ?? null;

  let initialMatch: JudgeMatchContext | null = null;
  if (currentStationId) {
    const station = stations.find((s) => s.id === currentStationId);
    if (station?.currentMatchId) {
      const stationMatch = matches.find((m) => m.id === station.currentMatchId);
      if (stationMatch?.participantAId && stationMatch?.participantBId) {
        initialMatch = {
          matchId: stationMatch.id,
          round: stationMatch.round,
          matchNumber: stationMatch.matchNumber,
          stage: stationMatch.groupId
            ? `Group ${groups.find((g) => g.id === stationMatch.groupId)?.label ?? "?"}`
            : "Final Stage",
          participantAId: stationMatch.participantAId,
          participantBId: stationMatch.participantBId,
        };
      }
    }
  }

  return (
    <JudgeConsole
      slug={slug}
      tournamentId={tournament.id}
      tournamentTitle={tournament.title}
      stations={stations}
      initialStationId={currentStationId}
      judgeName={profile?.display_name ?? user.email?.split("@")[0] ?? "Judge"}
      judgeUsername={profile?.username ?? ""}
      participants={participants}
      matches={matches}
      groups={groups}
      initialMatch={initialMatch}
    />
  );
}
