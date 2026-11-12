import type { Metadata } from "next";
import { Ban, KeyRound, MapPin, UserPlus, Users } from "lucide-react";

import { PlayersPanel, type PlayerRow } from "@/components/backend/PlayersPanel";
import { createClient } from "@/lib/supabase/server";
import { KpiCard, KpiGrid, PageHeader, Panel } from "@/components/dashboard/erp";
import { BarList } from "@/components/dashboard/charts";

export const metadata: Metadata = { title: "Players", robots: { index: false, follow: false } };

// `profiles` is 1:1 with every Supabase auth user (see handle_new_user's
// on_auth_user_created trigger, 20250101000002_core_tables.sql) — every
// account on the platform, not a subset. Limited to a generous ceiling
// rather than left fully unbounded (a naive `select *` with no limit can
// still get capped by PostgREST's own max-rows setting anyway); raise this
// if the platform ever actually approaches it. Same pragmatic
// client-side search/paginate-over-a-fetched-page approach as the other
// backend list pages (ParticipantsPanel and friends), rather than building
// out full server-side search/pagination for one list.
const PLAYER_FETCH_LIMIT = 10_000;

export default async function PlayersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, province, is_banned, provider, created_at")
    .order("created_at", { ascending: false })
    .limit(PLAYER_FETCH_LIMIT);

  const players: PlayerRow[] = (
    (data as { id: string; display_name: string; username: string; province: string | null; is_banned: boolean; provider: string | null; created_at: string }[] | null) ?? []
  ).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    username: p.username,
    province: p.province,
    isBanned: p.is_banned,
    // Accounts created before the `provider` column existed (see
    // 20250101000051_google_username_generation.sql) read null here — email/
    // password was the only sign-up option before Google existed, so null
    // reads as "Email" in PlayersPanel.
    provider: p.provider,
    joinedAt: p.created_at,
  }));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newThisMonth = players.filter((p) => new Date(p.joinedAt).getTime() >= thirtyDaysAgo).length;
  const bannedCount = players.filter((p) => p.isBanned).length;
  const googleCount = players.filter((p) => p.provider === "google").length;
  const provinceCounts = new Map<string, number>();
  for (const p of players) {
    const key = p.province ?? "Not set";
    provinceCounts.set(key, (provinceCounts.get(key) ?? 0) + 1);
  }
  const topProvinces = [...provinceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Players"
        description="Every account on the platform — everyone starts as a player."
      />
      <div className="grid gap-3 lg:grid-cols-3">
        <KpiGrid className="sm:grid-cols-2 lg:col-span-2 xl:grid-cols-2">
          <KpiCard label="Total players" value={players.length.toLocaleString()} icon={Users} emphasis hint="Every account on the platform" />
          <KpiCard label="Joined last 30 days" value={newThisMonth.toLocaleString()} icon={UserPlus} hint="New sign-ups" />
          <KpiCard label="Google sign-ins" value={googleCount.toLocaleString()} icon={KeyRound} hint={`${(players.length - googleCount).toLocaleString()} via email`} />
          <KpiCard label="Banned" value={bannedCount.toLocaleString()} icon={Ban} hint="Accounts currently banned" />
        </KpiGrid>
        <Panel title="Top provinces" icon={MapPin} meta={`${provinceCounts.size} total`}>
          <BarList items={topProvinces} emptyLabel="No players yet." />
        </Panel>
      </div>
      <div>
        <PlayersPanel players={players} />
      </div>
    </div>
  );
}
