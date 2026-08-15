import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RevenuePanel, type RevenueRow } from "@/components/dashboard/organizer/RevenuePanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Tournament, TournamentPreregistration } from "@/lib/types/database";

export const metadata: Metadata = { title: "Revenue", robots: { index: false, follow: false } };

export default async function RevenuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/revenue");

  const supabase = await createClient();
  const { data: tournamentRows } = await supabase
    .from("tournaments")
    .select("id, title, entry_fee, preregistration_amount")
    .eq("organizer_id", user.id);
  const tournaments =
    (tournamentRows as Pick<Tournament, "id" | "title" | "entry_fee" | "preregistration_amount">[] | null) ?? [];
  const tournamentIds = tournaments.map((t) => t.id);

  let rows: RevenueRow[] = [];
  if (tournamentIds.length > 0) {
    const { data: preregRows } = await supabase
      .from("tournament_preregistrations")
      .select("*")
      .eq("advance_payment", true)
      .in("tournament_id", tournamentIds)
      .order("created_at", { ascending: false });

    const tournamentById = new Map(tournaments.map((t) => [t.id, t]));
    rows = ((preregRows as TournamentPreregistration[] | null) ?? []).map((p) => {
      const tournament = tournamentById.get(p.tournament_id);
      return {
        id: p.id,
        tournamentTitle: tournament?.title ?? "Unknown Tournament",
        // The amount this guest is expected to have paid — the tournament's
        // own configured pre-registration fee (Settings -> Registration
        // Fee), falling back to its general entry fee. No per-submission
        // amount is captured today; a guest just uploads a screenshot (see
        // PreRegisterDialog).
        amount: tournament?.preregistration_amount ?? tournament?.entry_fee ?? 0,
        status: p.payment_status,
        submittedAt: p.created_at,
      };
    });
  }

  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Revenue</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Entry fee collections across your tournaments.</p>
      <div className="mt-8">
        <RevenuePanel totalTournaments={tournaments.length} rows={rows} />
      </div>
    </div>
  );
}
