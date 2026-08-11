import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flag, Trophy } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceStandingsTable } from "@/components/dashboard/organizer/WorkspaceStandingsTable";
import { GroupStandingsTable } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { FinalStageStandingsTable } from "@/components/dashboard/organizer/FinalStageStandingsTable";
import { getTournamentWorkspace } from "@/lib/mock/tournament-workspace";
import { computeFinalStandings, placeholderSlots, qualifiedSlots } from "@/lib/final-stage-placeholder";
import { computeGroupStandings } from "@/lib/swiss";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

export const metadata: Metadata = { title: "Standings", robots: { index: false, follow: false } };

export default async function StandingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}/standings`);

  const tournament = await getManagedTournament(user.id, slug);
  const settings = tournament.format_settings;
  const isSwissTwoStage = settings?.stageType === "two_stage" && settings.groupStage.format === "swiss";

  if (!isSwissTwoStage) {
    // Everything else (single stage, or a two-stage tournament using a group
    // format other than Swiss) still runs on the mock-derived preview — see
    // the same fallback on the workspace index and final-stage pages.
    const workspace = getTournamentWorkspace(tournament);
    return (
      <div>
        <p className="label-mono text-primary">Tournament Management</p>
        <h2 className="heading mt-2 text-2xl">Standings</h2>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          Overall placement across the whole tournament, updated as matches are reported.
        </p>
        <div className="mt-8">
          <WorkspaceStandingsTable standings={workspace.overallStandings} />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: groups }, { data: participants }, { data: matches }] = await Promise.all([
    supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
    supabase.from("matches").select("*").eq("tournament_id", tournament.id),
  ]);

  const realGroups = (groups as TournamentGroup[] | null) ?? [];
  const realParticipants = (participants as TournamentParticipant[] | null) ?? [];
  const realMatches = (matches as Match[] | null) ?? [];
  const groupStageEnded = settings.groupStageEnded === true;
  const finalStageStarted = settings.finalStageStarted === true;
  const advancePerGroup = settings.groupStage.participantsAdvancePerGroup;

  const standingsByGroupId = new Map(
    realGroups.map((g) => {
      const members = realParticipants.filter((p) => p.group_id === g.id);
      const groupMatches = realMatches.filter((m) => m.group_id === g.id);
      const rows = computeGroupStandings(members, groupMatches, settings.groupStage.swissPoints, [
        settings.groupTieBreaks.tieBreak1,
        settings.groupTieBreaks.tieBreak2,
        settings.groupTieBreaks.tieBreak3,
      ]);
      return [g.id, rows] as const;
    })
  );

  const slots = groupStageEnded
    ? qualifiedSlots(
        realGroups,
        new Map(
          [...standingsByGroupId].map(([groupId, rows]) => [
            groupId,
            rows.map((r) => ({ participantId: r.participantId, name: r.name, teamName: r.teamName })),
          ])
        ),
        advancePerGroup
      )
    : placeholderSlots(realGroups, advancePerGroup);
  const finalMatches = realMatches.filter((m) => m.group_id === null);
  const finalRows = finalStageStarted ? computeFinalStandings(slots, finalMatches) : [];

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Standings</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Overall placement across the whole tournament, updated as matches are reported.
      </p>

      <div className="mt-8">
        <Tabs defaultValue={finalStageStarted ? "final" : "group"}>
          <TabsList>
            <TabsTrigger value="group" className="gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Group Stage
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> Final Stage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="group">
            {realGroups.length > 0 ? (
              <div className="space-y-8">
                {realGroups.map((g) => {
                  const members = realParticipants.filter((p) => p.group_id === g.id);
                  const groupMatches = realMatches.filter((m) => m.group_id === g.id);
                  return (
                    <section key={g.id}>
                      <h3 className="label-mono mb-3 text-on-surface/60">Group {g.label}</h3>
                      <GroupStandingsTable
                        participants={members}
                        matches={groupMatches}
                        swissPoints={settings.groupStage.swissPoints}
                        tieBreakMetrics={[settings.groupTieBreaks.tieBreak1, settings.groupTieBreaks.tieBreak2, settings.groupTieBreaks.tieBreak3]}
                      />
                    </section>
                  );
                })}
              </div>
            ) : (
              <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
                No groups yet.
              </p>
            )}
          </TabsContent>

          <TabsContent value="final">
            {finalStageStarted ? (
              <FinalStageStandingsTable rows={finalRows} />
            ) : (
              <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
                {groupStageEnded
                  ? "Start the final stage to see standings here."
                  : "Standings will appear once the group stage ends and the final stage starts."}
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
