import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentLogPanel } from "@/components/dashboard/organizer/TournamentLogPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { TournamentLogEntry } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard/erp";

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
      <PageHeader
        eyebrow="Tournament Management"
        title="Log"
        description={<>Every event, in order &mdash; registrations, results, and posts.</>}
        as="h2"
      />
      <div className="mt-5">
        <TournamentLogPanel log={log} />
      </div>
    </div>
  );
}
