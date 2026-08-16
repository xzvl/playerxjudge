import type { Metadata } from "next";

import { PlayersPanel, type PlayerRow } from "@/components/backend/PlayersPanel";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Players", robots: { index: false, follow: false } };

// Capped at the 200 most recently joined — same pragmatic client-side
// search/paginate-over-a-fetched-page approach as the other backend list
// pages (ParticipantsPanel and friends), rather than building out full
// server-side search/pagination for one list.
const PLAYER_FETCH_LIMIT = 200;

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, province, is_banned, created_at")
    .order("created_at", { ascending: false })
    .limit(PLAYER_FETCH_LIMIT);

  const players: PlayerRow[] = (
    (data as { id: string; display_name: string; username: string; province: string | null; is_banned: boolean; created_at: string }[] | null) ?? []
  ).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    username: p.username,
    province: p.province,
    isBanned: p.is_banned,
    joinedAt: p.created_at,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Players</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every account on the platform — everyone starts as a player.</p>
      <div className="mt-8">
        <PlayersPanel players={players} />
      </div>
    </div>
  );
}
