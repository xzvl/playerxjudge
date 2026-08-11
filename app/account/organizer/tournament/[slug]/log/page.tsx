import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentLogPanel } from "@/components/dashboard/organizer/TournamentLogPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentLogEntry } from "@/lib/types/database";

export const metadata: Metadata = { title: "Log", robots: { index: false, follow: false } };

export default async function LogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/log`);

  const tournament = await getManagedTournament(user.id, slug);
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("tournament_log_entries")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("created_at", { ascending: false });

  const log = ((entries as TournamentLogEntry[] | null) ?? []).map((e) => ({
    id: e.id,
    actor: e.actor,
    action: e.action,
    at: e.created_at,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Log</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every event, in order &mdash; registrations, results, and posts.</p>
      <div className="mt-8">
        <TournamentLogPanel log={log} />
      </div>
    </div>
  );
}
