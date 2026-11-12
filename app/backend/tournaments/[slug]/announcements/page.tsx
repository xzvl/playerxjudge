import type { Metadata } from "next";

import { TournamentAnnouncementsPanel, type AnnouncementItem } from "@/components/dashboard/organizer/TournamentAnnouncementsPanel";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournamentForStaff } from "@/app/account/organizer/tournament/[slug]/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Announcement", robots: { index: false, follow: false } };

interface AnnouncementRow {
  id: string;
  message: string;
  created_at: string;
  profiles: { display_name: string } | null;
}

export default async function BackendAnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getManagedTournamentForStaff(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournament_announcements")
    .select("id, message, created_at, profiles(display_name)")
    .eq("tournament_id", tournament.id)
    .order("created_at", { ascending: false });

  const announcements: AnnouncementItem[] = ((data as unknown as AnnouncementRow[] | null) ?? []).map((a) => ({
    id: a.id,
    author: a.profiles?.display_name ?? "Organizer",
    message: a.message,
    postedAt: a.created_at,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Backend"
        title="Announcement"
        description="Keep every registered participant in the loop."
        as="h2"
      />
      <div className="mt-5">
        <TournamentAnnouncementsPanel tournamentId={tournament.id} slug={tournament.slug} announcements={announcements} />
      </div>
    </div>
  );
}
