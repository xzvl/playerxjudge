import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bomb, Flame, RotateCw, Rocket, Siren } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { computeGroupStandings } from "@/lib/swiss";
import { computeFinisherLeaderboards, computePenaltyLeaderboard, type FinisherEntry } from "@/lib/tournaments/top-finishers";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { FinishType, Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

export const metadata: Metadata = { title: "Top Finishers", robots: { index: false, follow: false } };

const FINISH_CARD_META: Record<FinishType, { label: string; icon: LucideIcon; color: string }> = {
  extreme: { label: "Extreme Finishes", icon: Flame, color: "#d946ef" },
  burst: { label: "Burst Finishes", icon: Bomb, color: "#f97316" },
  over: { label: "Over Finishes", icon: Rocket, color: "#22d3ee" },
  spin: { label: "Spin Finishes", icon: RotateCw, color: "#6366f1" },
};

function LeaderboardCard({ title, icon: Icon, color, entries }: { title: string; icon: LucideIcon; color: string; entries: FinisherEntry[] }) {
  return (
    <div className="border border-outline-variant/25">
      <div className="flex items-center gap-2 border-b border-outline-variant/25 bg-surface-container-low p-4">
        <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
        <p className="label-mono text-on-surface/70">{title}</p>
      </div>
      {entries.length > 0 ? (
        <ol>
          {entries.map((e, i) => (
            <li
              key={e.participantId}
              className="flex items-center gap-3 border-b border-outline-variant/15 px-4 py-2.5 last:border-0"
            >
              <span className="w-5 shrink-0 font-mono text-xs text-on-surface/40">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-on-surface">{e.teamName ?? e.name}</span>
              <span className="font-mono text-sm text-on-surface/70">{e.count}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-6 text-center text-sm text-on-surface/50">No finishes recorded yet.</p>
      )}
    </div>
  );
}

export default async function TopFinishersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/top-finishers`);

  const tournament = await getManagedTournament(user.id, slug);
  const settings = tournament.format_settings;
  const isTwoStage = settings?.stageType === "two_stage";

  const supabase = await createClient();
  const [{ data: participants }, { data: matches }, { data: groups }] = await Promise.all([
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
    supabase.from("matches").select("*").eq("tournament_id", tournament.id),
    isTwoStage
      ? supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id).order("sort_order")
      : Promise.resolve({ data: [] as TournamentGroup[] }),
  ]);

  const realParticipants = (participants as TournamentParticipant[] | null) ?? [];
  const realMatches = (matches as Match[] | null) ?? [];
  const realGroups = (groups as TournamentGroup[] | null) ?? [];

  // Tournament-wide standings — every participant, every match (group stage
  // and final stage together) — computed purely to break ties on the
  // leaderboards below the same way Standings itself ranks people: W-L-T,
  // score, tie break #1/#2/#3, then TB. Not rendered directly here, just
  // turned into a participantId -> rank map for topEntries to sort by.
  const overallStandings = settings
    ? computeGroupStandings(realParticipants, realMatches, settings.groupStage.swissPoints, [
        settings.groupTieBreaks.tieBreak1,
        settings.groupTieBreaks.tieBreak2,
        settings.groupTieBreaks.tieBreak3,
      ])
    : [];
  const standingsRank = new Map(overallStandings.map((r, i) => [r.participantId, i]));

  const finishers = computeFinisherLeaderboards(realParticipants, realMatches, standingsRank);
  const penalties = computePenaltyLeaderboard(realParticipants, realMatches, standingsRank);

  // Reuses the exact same standings computation the Standings page runs
  // (computeGroupStandings, lib/swiss.ts) — `rows` comes back sorted
  // best-to-worst, so the first/last rows are each group's top and bottom
  // finish. Shown live (not gated behind groupStageEnded), same as Standings.
  const groupExtremes =
    isTwoStage && settings
      ? realGroups.map((g) => {
          const members = realParticipants.filter((p) => p.group_id === g.id);
          const groupMatches = realMatches.filter((m) => m.group_id === g.id);
          const rows = computeGroupStandings(members, groupMatches, settings.groupStage.swissPoints, [
            settings.groupTieBreaks.tieBreak1,
            settings.groupTieBreaks.tieBreak2,
            settings.groupTieBreaks.tieBreak3,
          ]);
          return { group: g, top: rows[0] ?? null, bottom: rows.length > 1 ? rows[rows.length - 1] : null };
        })
      : [];

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Top Finishers</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Top 5 across the whole tournament — group stage and final stage together.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(FINISH_CARD_META) as FinishType[]).map((type) => (
          <LeaderboardCard key={type} title={FINISH_CARD_META[type].label} icon={FINISH_CARD_META[type].icon} color={FINISH_CARD_META[type].color} entries={finishers[type]} />
        ))}
        <LeaderboardCard title="Penalty Points" icon={Siren} color="#fb7185" entries={penalties} />
      </div>

      {isTwoStage ? (
        <div className="mt-10">
          <h3 className="label-mono mb-3 text-on-surface/60">Group Standings — Top &amp; Bottom</h3>
          {groupExtremes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groupExtremes.map(({ group, top, bottom }) => (
                <div key={group.id} className="border border-outline-variant/25 p-4">
                  <p className="heading mb-3 text-base">Group {group.label}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="success">1st</Badge>
                      <span className="min-w-0 flex-1 truncate text-right text-on-surface">
                        {top ? (top.teamName ?? top.name) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="destructive">Last</Badge>
                      <span className="min-w-0 flex-1 truncate text-right text-on-surface">
                        {bottom ? (bottom.teamName ?? bottom.name) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
              No groups yet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
