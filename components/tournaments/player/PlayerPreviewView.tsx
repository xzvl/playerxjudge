import { Crown, Trophy, UserRound } from "lucide-react";

import { PlayerNamePicker } from "@/components/tournaments/player/PlayerNamePicker";
import { WorkspaceBracket } from "@/components/dashboard/organizer/WorkspaceBracket";
import { WorkspaceStandingsTable } from "@/components/dashboard/organizer/WorkspaceStandingsTable";
import type { TournamentWorkspace } from "@/lib/mock/tournament-workspace";

// Only the group stage's Swiss format has a real pairing/standings engine
// behind it right now (same boundary the organizer workspace pages draw —
// see GroupStageWorkspace.tsx and matches-actions.ts#startFinalStage). Every
// other stage/format combination — including the default single-stage,
// single-elimination setup new tournaments start with — still runs on the
// same deterministic mock-derived preview the organizer's own workspace
// pages fall back to, so this stays a read-only, best-effort view rather
// than fabricating per-battle finish stats that don't exist yet.
export function PlayerPreviewView({
  workspace,
  selectedId,
}: {
  workspace: TournamentWorkspace;
  selectedId: string | null;
}) {
  const options = workspace.participants.map((p) => ({ id: p.id, displayName: p.teamName ?? p.name }));
  const selected = workspace.participants.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-12">
      <section id="player" className="scroll-mt-20">
        <h2 className="label-mono flex items-center gap-2 text-primary">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Current Stats
        </h2>
        <p className="mt-1 max-w-xl text-sm text-on-surface/40">
          Detailed per-battle stats aren&apos;t available for this tournament&apos;s format yet — showing a standings preview instead.
        </p>

        <div className="mt-6">
          <PlayerNamePicker options={options} selectedId={selectedId} />
        </div>

        {selected ? (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md">
            <div className="border border-outline-variant/25 bg-surface-container-low px-4 py-5 text-center">
              <p className="font-mono text-2xl font-bold text-on-surface">
                {selected.wins}-{selected.losses}
              </p>
              <p className="label-mono mt-1 text-[10px] text-on-surface/40">W-L</p>
            </div>
            <div className="border border-outline-variant/25 bg-surface-container-low px-4 py-5 text-center">
              <p className="font-mono text-2xl font-bold text-on-surface">{selected.points}</p>
              <p className="label-mono mt-1 text-[10px] text-on-surface/40">Points</p>
            </div>
            <div className="border border-outline-variant/25 bg-surface-container-low px-4 py-5 text-center">
              <p className="font-mono text-2xl font-bold text-on-surface">{selected.groupLabel ?? "—"}</p>
              <p className="label-mono mt-1 text-[10px] text-on-surface/40">Group</p>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-on-surface/40">Pick a participant above to see their stats.</p>
        )}
      </section>

      <section id="tournament" className="scroll-mt-20">
        <h2 className="label-mono mb-3 flex items-center gap-2 text-primary">
          <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Tournament Stages and Standing
        </h2>

        {workspace.champion ? (
          <div className="mb-4 flex items-center gap-2 border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            <Crown className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="font-medium">{workspace.champion.teamName ?? workspace.champion.name}</span> is the champion.
          </div>
        ) : null}

        {workspace.groups ? (
          <div className="mb-8 space-y-8">
            {workspace.groups.map((group) => (
              <div key={group.label}>
                <h3 className="label-mono mb-3 text-on-surface/60">{group.label}</h3>
                <WorkspaceStandingsTable standings={group.standings} />
              </div>
            ))}
          </div>
        ) : null}

        {workspace.finalUsesBracket ? (
          <WorkspaceBracket rounds={workspace.finalBracket ?? []} />
        ) : (
          <WorkspaceStandingsTable standings={workspace.finalStandingsTable ?? []} />
        )}
      </section>

      <section id="matches" className="scroll-mt-20">
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          Match-by-match history will appear here once this tournament&apos;s format has real match reporting.
        </p>
      </section>

      <section id="statistics" className="scroll-mt-20">
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          Finish-type statistics will appear here once this tournament&apos;s format has real match reporting.
        </p>
      </section>
    </div>
  );
}
