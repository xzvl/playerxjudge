import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WorkspaceBracket } from "@/components/dashboard/organizer/WorkspaceBracket";
import { WorkspaceStandingsTable } from "@/components/dashboard/organizer/WorkspaceStandingsTable";
import { SwissGroupStageControls } from "@/components/dashboard/organizer/SwissGroupStageControls";
import { GroupStageWorkspace } from "@/components/dashboard/organizer/GroupStageWorkspace";
import { GroupStageRound1Preview } from "@/components/dashboard/organizer/GroupStageRound1Preview";
import { STAGE_FORMAT_OPTIONS, GRAND_FINALS_OPTIONS } from "@/lib/validations/tournament-wizard";
import { getTournamentWorkspace } from "@/lib/mock/tournament-workspace";
import { getCurrentUser, isCurrentUserStaff } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournament } from "@/app/account/organizer/tournament/[slug]/data";
import type { Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Tournament — ${slug}`, robots: { index: false, follow: false } };
}

function GroupAssignmentRequiredNotice({ slug }: { slug: string }) {
  return (
    <div className="mt-2 border border-outline-variant/25 bg-surface-container-low p-8 text-center">
      <p className="heading text-lg text-on-surface">Group Assignments Required</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-on-surface/60">
        Please assign all participants to their respective groups to proceed to the next step.
      </p>
      <Button asChild className="mt-5 gap-1.5" tooltip="Go assign participants to groups">
        <Link href={`/account/organizer/tournament/${slug}/participants?tab=groups`}>
          <Users className="h-3.5 w-3.5" /> Manage Groups
        </Link>
      </Button>
    </div>
  );
}

export default async function TournamentWorkspaceIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/tournament/${slug}`);

  const tournament = await getManagedTournament(user.id, slug);
  const workspace = getTournamentWorkspace(tournament);
  const settings = tournament.format_settings;

  if (workspace.isTwoStage) {
    const isSwiss = settings.groupStage.format === "swiss";

    if (!isSwiss) {
      // Round-robin/elimination group formats still use the mock-derived
      // preview — only Swiss has a real pairing/standings engine so far.
      const advancePerGroup = settings.groupStage.participantsAdvancePerGroup;
      return (
        <div>
          <p className="label-mono text-primary">Tournament Management</p>
          <h2 className="heading mt-2 text-2xl">Group Stage</h2>
          <p className="mt-2 max-w-xl text-sm text-on-surface/60">
            Top {advancePerGroup} from each group advance
            {workspace.seedingReady ? "" : " once registration closes and groups are seeded"}.
          </p>

          {workspace.groups && workspace.groups.length > 0 ? (
            <div className="mt-8 space-y-8">
              {workspace.groups.map((group) => (
                <section key={group.label}>
                  <h3 className="label-mono mb-3 text-on-surface/60">{group.label}</h3>
                  <WorkspaceStandingsTable standings={group.standings} />
                </section>
              ))}
            </div>
          ) : (
            <p className="mt-8 border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
              These groups are a preview and subject to change until the tournament is started.
            </p>
          )}
        </div>
      );
    }

    const supabase = await createClient();
    const [{ data: participants }, { data: groups }, staff] = await Promise.all([
      supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
      supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id).order("sort_order"),
      isCurrentUserStaff(),
    ]);

    const realParticipants = (participants as TournamentParticipant[] | null) ?? [];
    const realGroups = (groups as TournamentGroup[] | null) ?? [];
    const unassignedCount = realParticipants.filter((p) => p.group_id === null).length;
    const assignmentComplete = realGroups.length > 0 && unassignedCount === 0 && realParticipants.length > 0;

    let matches: Match[] = [];
    if (assignmentComplete) {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("round")
        .order("match_number");
      matches = (data as Match[] | null) ?? [];
    }

    const swissRoundsCap = settings.groupStage.swissRounds ?? 5;
    const groupStageEnded = settings.groupStageEnded === true;

    const roundsCompletedPerGroup = realGroups.map((g) => {
      const groupMatches = matches.filter((m) => m.group_id === g.id);
      if (groupMatches.length === 0) return 0;
      const latest = Math.max(...groupMatches.map((m) => m.round));
      const latestComplete = groupMatches.filter((m) => m.round === latest).every((m) => m.status === "completed");
      return latestComplete ? latest : latest - 1;
    });
    const totalExpectedRounds = realGroups.length * swissRoundsCap;
    const progressPercent =
      totalExpectedRounds > 0
        ? Math.round((roundsCompletedPerGroup.reduce((a, b) => a + b, 0) / totalExpectedRounds) * 100)
        : 0;
    const allGroupsFinished = realGroups.length > 0 && roundsCompletedPerGroup.every((r) => r >= swissRoundsCap);

    return (
      <div>
        <p className="label-mono text-primary">Tournament Management</p>
        <h2 className="heading mt-2 text-2xl">Group Stage</h2>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          Top {settings.groupStage.participantsAdvancePerGroup} from each group advance.
        </p>

        {!groupStageEnded ? (
          <SwissGroupStageControls
            tournamentId={tournament.id}
            slug={tournament.slug}
            currentSwissRounds={swissRoundsCap}
            phase={matches.length > 0 ? "started" : assignmentComplete ? "ready" : "not-assigned"}
            progressPercent={progressPercent}
            allGroupsFinished={allGroupsFinished}
          />
        ) : null}

        {!assignmentComplete ? (
          <GroupAssignmentRequiredNotice slug={tournament.slug} />
        ) : matches.length === 0 ? (
          <GroupStageRound1Preview groups={realGroups} participants={realParticipants} />
        ) : (
          <GroupStageWorkspace
            tournamentId={tournament.id}
            slug={tournament.slug}
            groups={realGroups}
            participants={realParticipants}
            matches={matches}
            swissPoints={settings.groupStage.swissPoints}
            tieBreakMetrics={[settings.groupTieBreaks.tieBreak1, settings.groupTieBreaks.tieBreak2, settings.groupTieBreaks.tieBreak3]}
            swissRoundsCap={settings.groupStage.swissRounds ?? 5}
            advancePerGroup={settings.groupStage.participantsAdvancePerGroup}
            locked={settings.finalStageStarted === true}
            canSwapParticipants={staff}
          />
        )}
      </div>
    );
  }

  const formatLabel = STAGE_FORMAT_OPTIONS.find((o) => o.value === workspace.finalFormat)?.label ?? workspace.finalFormat;
  const grandFinalsLabel =
    workspace.finalFormat === "double_elimination"
      ? GRAND_FINALS_OPTIONS.find((o) => o.value === settings?.finalStage?.grandFinalsModifier)?.label
      : null;

  return (
    <div>
      <p className="label-mono text-primary">Tournament Management</p>
      <h2 className="heading mt-2 text-2xl">Final Stage</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        {formatLabel}
        {grandFinalsLabel ? ` · Grand Finals: ${grandFinalsLabel}` : ""}
        {workspace.finalUsesBracket && workspace.finalFormat === "double_elimination" ? " (winners bracket shown)" : ""}
      </p>

      {workspace.champion ? (
        <div className="mt-4 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">{workspace.champion.teamName ?? workspace.champion.name}</span> is the champion.
        </div>
      ) : null}

      <div className="mt-8">
        {workspace.finalUsesBracket ? (
          <WorkspaceBracket rounds={workspace.finalBracket ?? []} />
        ) : (
          <WorkspaceStandingsTable standings={workspace.finalStandingsTable ?? []} />
        )}
      </div>
    </div>
  );
}
