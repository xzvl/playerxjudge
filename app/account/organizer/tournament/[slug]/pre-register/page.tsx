import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentPreRegisterWorkspace } from "@/components/dashboard/organizer/TournamentPreRegisterWorkspace";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentPreregistration } from "@/lib/types/database";

export const metadata: Metadata = { title: "Pre-Registrations", robots: { index: false, follow: false } };

export default async function TournamentPreRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/pre-register`);

  const tournament = await getManagedTournament(user.id, slug);

  const supabase = await createClient();
  const { data: preregistrations } = await supabase
    .from("tournament_preregistrations")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Pre-Registrations</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Everyone who submitted the public Pre-register form, before they&apos;re on the actual roster.
      </p>
      <div className="mt-8">
        <TournamentPreRegisterWorkspace
          tournamentId={tournament.id}
          slug={tournament.slug}
          initialPreregistrations={(preregistrations as TournamentPreregistration[] | null) ?? []}
        />
      </div>
    </div>
  );
}
