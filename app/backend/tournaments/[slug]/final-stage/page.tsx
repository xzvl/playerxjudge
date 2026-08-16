import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Crown } from "lucide-react";

import { WorkspaceBracket } from "@/components/dashboard/organizer/WorkspaceBracket";
import { WorkspaceStandingsTable } from "@/components/dashboard/organizer/WorkspaceStandingsTable";
import { StartFinalStageControls } from "@/components/dashboard/organizer/StartFinalStageControls";
import { EndOfTournamentControls } from "@/components/dashboard/organizer/EndOfTournamentControls";
import { FinalStageBracketWorkspace } from "@/components/dashboard/organizer/FinalStageBracketWorkspace";
import { STAGE_FORMAT_OPTIONS, GRAND_FINALS_OPTIONS } from "@/lib/validations/tournament-wizard";
import { getTournamentWorkspace } from "@/lib/mock/tournament-workspace";
import { buildPlacementSections, buildSeededBracket, placeholderSlots, qualifiedSlots } from "@/lib/final-stage-placeholder";
import { computeGroupStandings } from "@/lib/swiss";
import { createClient } from "@/lib/supabase/server";
import { getManagedTournamentForStaff } from "@/app/account/organizer/tournament/[slug]/data";
import type { Bracket, Match, TournamentGroup, TournamentParticipant } from "@/lib/types/database";

export const metadata: Metadata = { title: "Final Stage", robots: { index: false, follow: false } };

export default async function BackendFinalStagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getManagedTournamentForStaff(slug);
  if (tournament.format_settings?.stageType !== "two_stage") {
    // Single-stage tournaments have no separate group stage — Final Stage
    // content lives at the workspace root instead of its own route.
    redirect(`/backend/tournaments/${slug}`);
  }

  const settings = tournament.format_settings;
  const isSwiss = settings.groupStage.format === "swiss";

  if (!isSwiss) {
    const workspace = getTournamentWorkspace(tournament);
    const formatLabel = STAGE_FORMAT_OPTIONS.find((o) => o.value === workspace.finalFormat)?.label ?? workspace.finalFormat;
    const grandFinalsLabel =
      workspace.finalFormat === "double_elimination"
        ? GRAND_FINALS_OPTIONS.find((o) => o.value === settings.finalStage.grandFinalsModifier)?.label
        : null;

    return (
      <div>
        <p className="label-mono text-primary">Backend</p>
        <h2 className="heading mt-2 text-2xl">Final Stage</h2>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          {formatLabel}
          {grandFinalsLabel ? ` · Grand Finals: ${grandFinalsLabel}` : ""}
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

  const supabase = await createClient();
  const [{ data: groups }, { data: participants }, { data: matches }, { data: brackets }] = await Promise.all([
    supabase.from("tournament_groups").select("*").eq("tournament_id", tournament.id).order("sort_order"),
    supabase.from("tournament_participants").select("*").eq("tournament_id", tournament.id).order("seed"),
    supabase.from("matches").select("*").eq("tournament_id", tournament.id),
    supabase.from("brackets").select("*").eq("tournament_id", tournament.id),
  ]);

  const realGroups = (groups as TournamentGroup[] | null) ?? [];
  const realParticipants = (participants as TournamentParticipant[] | null) ?? [];
  const realMatches = (matches as Match[] | null) ?? [];
  const realBrackets = (brackets as Bracket[] | null) ?? [];
  const groupStageEnded = settings.groupStageEnded === true;
  const advancePerGroup = settings.groupStage.participantsAdvancePerGroup;

  const slots = groupStageEnded
    ? qualifiedSlots(
        realGroups,
        new Map(
          realGroups.map((g) => {
            const members = realParticipants.filter((p) => p.group_id === g.id);
            const groupMatches = realMatches.filter((m) => m.group_id === g.id);
            const rows = computeGroupStandings(members, groupMatches, settings.groupStage.swissPoints, [
              settings.groupTieBreaks.tieBreak1,
              settings.groupTieBreaks.tieBreak2,
              settings.groupTieBreaks.tieBreak3,
            ]);
            return [g.id, rows.map((r) => ({ participantId: r.participantId, name: r.name, teamName: r.teamName }))] as const;
          })
        ),
        advancePerGroup
      )
    : placeholderSlots(realGroups, advancePerGroup);

  const finalStageStarted = settings.finalStageStarted === true;
  const finalMatches = realMatches.filter((m) => m.group_id === null);
  const bracketRounds = buildSeededBracket(slots);
  const participantsById = new Map(slots.map((s) => [s.id, { seed: s.seed, name: s.name, teamName: s.teamName }]));
  const placementSections = settings.finalStage.breakTiesWithPlacementMatches
    ? buildPlacementSections(bracketRounds.length, settings.finalStage.breakTiesThroughPlace ?? 0)
    : [];
  const tournamentCompleted = tournament.status === "completed";
  const allMatchesComplete = finalStageStarted && finalMatches.length > 0 && finalMatches.every((m) => m.status === "completed");

  const finalFormatLabel = STAGE_FORMAT_OPTIONS.find((o) => o.value === settings.finalStage.format)?.label ?? settings.finalStage.format;
  const grandFinalsLabel =
    settings.finalStage.format === "double_elimination"
      ? GRAND_FINALS_OPTIONS.find((o) => o.value === settings.finalStage.grandFinalsModifier)?.label
      : null;

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h2 className="heading mt-2 text-2xl">Final Stage</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        {finalFormatLabel}
        {grandFinalsLabel ? ` · Grand Finals: ${grandFinalsLabel}` : ""}
      </p>
      {!finalStageStarted ? (
        <p className="mt-1 text-xs text-on-surface/40">
          {groupStageEnded
            ? "Seeded from final group standings — start the final stage to generate real matches."
            : "Placeholder seeding — names fill in once the group stage finishes."}
        </p>
      ) : null}

      {tournamentCompleted && tournament.champion_name ? (
        <div className="mt-4 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">{tournament.champion_name}</span> is the champion.
        </div>
      ) : null}

      {groupStageEnded && !finalStageStarted ? (
        <div className="mt-8">
          <StartFinalStageControls tournamentId={tournament.id} slug={tournament.slug} />
        </div>
      ) : null}

      {allMatchesComplete && !tournamentCompleted ? (
        <div className="mt-8">
          <EndOfTournamentControls tournamentId={tournament.id} slug={tournament.slug} />
        </div>
      ) : null}

      <div className="mt-8">
        {finalStageStarted ? (
          <FinalStageBracketWorkspace
            slug={tournament.slug}
            baseRounds={bracketRounds}
            initialMatches={finalMatches}
            initialBrackets={realBrackets}
            placementSections={placementSections}
            participantsById={participantsById}
            locked={tournamentCompleted}
          />
        ) : (
          <WorkspaceBracket rounds={bracketRounds} />
        )}
      </div>
    </div>
  );
}
