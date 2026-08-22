import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisteredTournamentsPanel, type RegisteredEntry } from "@/components/dashboard/player/RegisteredTournamentsPanel";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getPublicTournamentListings } from "@/lib/tournaments/public-listings";
import { fetchLinkedTournaments } from "@/lib/player/linked-participants";
import type { TournamentPreregistration } from "@/lib/types/database";

export const metadata: Metadata = { title: "Registered Tournaments", robots: { index: false, follow: false } };

export default async function RegisteredTournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/registered-tournaments");

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  // Two signals for "tournaments I've joined": an organizer-confirmed
  // roster link (participant_links, via fetchLinkedTournaments) and a
  // pre-registration submission captured under my own username (see
  // 20250101000053_preregistration_select_own.sql — a player can only read
  // preregistration rows tagged with their own username). A pre-register
  // doesn't always turn into a roster link (or vice versa — an organizer
  // can add someone directly), so both count and are deduped by tournament.
  const [linked, tournaments, preregistrations] = await Promise.all([
    fetchLinkedTournaments(supabase, user.id),
    getPublicTournamentListings(),
    profile?.username
      ? supabase
          .from("tournament_preregistrations")
          .select("tournament_id, created_at")
          .eq("username", profile.username)
          .then((r) => (r.data as Pick<TournamentPreregistration, "tournament_id" | "created_at">[] | null) ?? [])
      : Promise.resolve([]),
  ]);

  const byId = new Map(tournaments.map((t) => [t.id, t]));

  // Earliest-known registeredAt wins per tournament — a pre-register
  // submission usually happens before the roster link is confirmed, so this
  // favors whichever signal actually reflects when the player first joined.
  const registeredAtByTournament = new Map<string, string>();
  function noteRegisteredAt(tournamentId: string, at: string) {
    const existing = registeredAtByTournament.get(tournamentId);
    if (!existing || new Date(at).getTime() < new Date(existing).getTime()) {
      registeredAtByTournament.set(tournamentId, at);
    }
  }
  for (const l of linked) noteRegisteredAt(l.tournamentId, l.linkedAt);
  for (const p of preregistrations) noteRegisteredAt(p.tournament_id, p.created_at);

  const entries: RegisteredEntry[] = [...registeredAtByTournament.entries()]
    .map(([tournamentId, registeredAt]) => {
      const tournament = byId.get(tournamentId);
      return tournament ? { registeredAt, tournament } : null;
    })
    .filter((e): e is RegisteredEntry => e !== null);

  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Registered Tournaments</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Tournaments where you&apos;re a confirmed, linked player — past and present.
      </p>
      <div className="mt-8">
        <RegisteredTournamentsPanel entries={entries} />
      </div>
    </div>
  );
}
