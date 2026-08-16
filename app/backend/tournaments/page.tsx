import type { Metadata } from "next";

import { TournamentsPanel, type TournamentItem } from "@/components/backend/TournamentsPanel";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types/database";

export const metadata: Metadata = { title: "Tournaments", robots: { index: false, follow: false } };

interface TournamentWithOrganizerRow extends Tournament {
  profiles: { display_name: string } | null;
}

export default async function BackendTournamentsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("id, title, slug, status, starts_at, profiles(display_name)")
    .order("starts_at", { ascending: false });

  const tournaments: TournamentItem[] = (
    (data as unknown as Pick<TournamentWithOrganizerRow, "id" | "title" | "slug" | "status" | "starts_at" | "profiles">[] | null) ?? []
  ).map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    organizerName: t.profiles?.display_name ?? "Unknown",
    status: t.status,
    startsAt: t.starts_at,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Tournaments</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every tournament on the platform.</p>
      <div className="mt-8">
        <TournamentsPanel tournaments={tournaments} />
      </div>
    </div>
  );
}
