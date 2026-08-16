import type { Metadata } from "next";

import { ParticipantsPanel, type ParticipantItem, type PendingLinkItem } from "@/components/backend/ParticipantsPanel";
import { createClient } from "@/lib/supabase/server";
import type { ParticipantLinkStatus } from "@/lib/types/database";

export const metadata: Metadata = { title: "Participants", robots: { index: false, follow: false } };

interface PendingLinkRow {
  id: string;
  status: ParticipantLinkStatus;
  tournament_participants: { id: string; name: string; team_name: string | null } | null;
  tournaments: { title: string } | null;
  profiles: { username: string; display_name: string } | null;
}

interface ParticipantRow {
  id: string;
  name: string;
  team_name: string | null;
  seed: number;
  tournaments: { title: string } | null;
}

// Capped at the 300 most recently added, same pragmatic
// fetch-then-client-search approach as the other backend list pages.
const PARTICIPANT_FETCH_LIMIT = 300;

export default async function BackendParticipantsPage() {
  const supabase = await createClient();
  const [{ data: linkRows }, { data: participantRows }] = await Promise.all([
    supabase
      .from("participant_links")
      .select("id, status, tournament_participants(id, name, team_name), tournaments(title), profiles!profile_id(username, display_name)")
      .eq("status", "pending"),
    supabase
      .from("tournament_participants")
      .select("id, name, team_name, seed, tournaments(title)")
      .order("created_at", { ascending: false })
      .limit(PARTICIPANT_FETCH_LIMIT),
  ]);

  const pendingLinks: PendingLinkItem[] = ((linkRows as unknown as PendingLinkRow[] | null) ?? [])
    .filter((r): r is PendingLinkRow & { tournament_participants: NonNullable<PendingLinkRow["tournament_participants"]> } => r.tournament_participants !== null)
    .map((r) => ({
      participantId: r.tournament_participants.id,
      participantLabel: r.tournament_participants.team_name ?? r.tournament_participants.name,
      tournamentTitle: r.tournaments?.title ?? "Unknown Tournament",
      link: { id: r.id, status: r.status, requesterName: r.profiles?.display_name ?? r.profiles?.username ?? "Unknown player" },
    }));

  const participants: ParticipantItem[] = ((participantRows as unknown as ParticipantRow[] | null) ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    teamName: p.team_name,
    tournamentTitle: p.tournaments?.title ?? "Unknown Tournament",
    seed: p.seed,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Participants</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Player-link requests waiting for review, and every tournament roster entry.</p>
      <div className="mt-8">
        <ParticipantsPanel pendingLinks={pendingLinks} participants={participants} />
      </div>
    </div>
  );
}
