import type { Metadata } from "next";
import { Clock3, Link2, ListChecks, Trophy } from "lucide-react";

import { ParticipantsPanel, type ParticipantItem, type PendingLinkItem } from "@/components/backend/ParticipantsPanel";
import { createClient } from "@/lib/supabase/server";
import type { ParticipantLinkInfo } from "@/components/dashboard/organizer/ParticipantLinkControls";
import type { ParticipantLinkStatus } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Participants", robots: { index: false, follow: false } };

interface LinkRow {
  id: string;
  status: ParticipantLinkStatus;
  participant_id: string;
  tournament_id: string;
  tournament_participants: { id: string; name: string; team_name: string | null } | null;
  tournaments: { title: string } | null;
  profiles: { username: string; display_name: string } | null;
}

interface ParticipantRow {
  id: string;
  name: string;
  team_name: string | null;
  seed: number;
  tournament_id: string;
  tournaments: { title: string } | null;
}

// Capped at the 300 most recently added, same pragmatic
// fetch-then-client-search approach as the other backend list pages.
const PARTICIPANT_FETCH_LIMIT = 300;

export default async function BackendParticipantsPage() {
  const supabase = await createClient();
  // Every link, not just pending ones — pending rows feed the "Pending
  // Player Links" review queue, the rest feed the "Linked Account" column
  // on "All Participants" below (see adminLinkParticipant/adminUnlinkParticipant
  // in actions.ts for the admin's own direct link/unlink, separate from the
  // self-serve request this pending queue reviews).
  const [{ data: linkRows }, { data: participantRows }] = await Promise.all([
    supabase
      .from("participant_links")
      .select(
        "id, status, participant_id, tournament_id, tournament_participants(id, name, team_name), tournaments(title), profiles!profile_id(username, display_name)"
      ),
    supabase
      .from("tournament_participants")
      .select("id, name, team_name, seed, tournament_id, tournaments(title)")
      .order("created_at", { ascending: false })
      .limit(PARTICIPANT_FETCH_LIMIT),
  ]);

  const allLinks = (linkRows as unknown as LinkRow[] | null) ?? [];

  const pendingLinks: PendingLinkItem[] = allLinks
    .filter((r): r is LinkRow & { tournament_participants: NonNullable<LinkRow["tournament_participants"]> } =>
      r.status === "pending" && r.tournament_participants !== null
    )
    .map((r) => ({
      participantId: r.tournament_participants.id,
      participantLabel: r.tournament_participants.team_name ?? r.tournament_participants.name,
      tournamentTitle: r.tournaments?.title ?? "Unknown Tournament",
      link: { id: r.id, status: r.status, requesterName: r.profiles?.display_name ?? r.profiles?.username ?? "Unknown player" },
    }));

  const linkByParticipantId = new Map<string, ParticipantLinkInfo>(
    allLinks.map((r) => [r.participant_id, { id: r.id, status: r.status, requesterName: r.profiles?.display_name ?? r.profiles?.username ?? "Unknown player" }])
  );

  const participants: ParticipantItem[] = ((participantRows as unknown as ParticipantRow[] | null) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    teamName: p.team_name,
    tournamentId: p.tournament_id,
    tournamentTitle: p.tournaments?.title ?? "Unknown Tournament",
    seed: p.seed,
    link: linkByParticipantId.get(p.id) ?? null,
  }));

  const linkedCount = participants.filter((p) => p.link?.status === "approved").length;
  const tournamentCount = new Set(participants.map((p) => p.tournamentId)).size;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Participants"
        description="Player-link requests waiting for review, and every tournament roster entry."
      />
      <KpiGrid>
        <KpiCard label="Roster entries" value={participants.length.toLocaleString()} icon={ListChecks} emphasis hint="Across all tournaments" />
        <KpiCard label="Pending links" value={pendingLinks.length} icon={Clock3} hint="Waiting for review" />
        <KpiCard label="Linked accounts" value={linkedCount.toLocaleString()} icon={Link2} hint="Entries tied to a player" />
        <KpiCard label="Tournaments" value={tournamentCount} icon={Trophy} hint="With at least one entry" />
      </KpiGrid>
      <div>
        <ParticipantsPanel pendingLinks={pendingLinks} participants={participants} />
      </div>
    </div>
  );
}
