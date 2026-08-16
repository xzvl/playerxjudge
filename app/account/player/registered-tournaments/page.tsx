import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisteredTournamentsPanel, type RegisteredEntry } from "@/components/dashboard/player/RegisteredTournamentsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getPublicTournamentListings } from "@/lib/tournaments/public-listings";
import { fetchLinkedTournaments } from "@/lib/player/linked-participants";

export const metadata: Metadata = { title: "Registered Tournaments", robots: { index: false, follow: false } };

export default async function RegisteredTournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/player/registered-tournaments");

  const supabase = await createClient();
  const [linked, tournaments] = await Promise.all([fetchLinkedTournaments(supabase, user.id), getPublicTournamentListings()]);

  const byId = new Map(tournaments.map((t) => [t.id, t]));
  const entries: RegisteredEntry[] = linked
    .map((l) => {
      const tournament = byId.get(l.tournamentId);
      return tournament ? { registeredAt: l.linkedAt, tournament } : null;
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
