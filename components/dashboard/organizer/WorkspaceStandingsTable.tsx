import { RegistrationStatusBadge } from "@/components/dashboard/organizer/badges";
import type { WorkspaceParticipant } from "@/lib/mock/tournament-workspace";

export function WorkspaceStandingsTable({
  standings,
  emptyMessage = "Standings will appear once seeding is complete.",
}: {
  standings: WorkspaceParticipant[];
  emptyMessage?: string;
}) {
  if (standings.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-outline-variant/25">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
            <th className="p-4" scope="col">Rank</th>
            <th className="p-4" scope="col">Participant</th>
            <th className="p-4" scope="col">Seed</th>
            <th className="p-4" scope="col">W&ndash;L</th>
            <th className="p-4" scope="col">Points</th>
            <th className="p-4" scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((p, i) => (
            <tr key={p.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
              <td className="p-4 font-mono text-on-surface/60">{i + 1}</td>
              <td className="p-4 font-medium text-on-surface">{p.teamName ?? p.name}</td>
              <td className="p-4 text-on-surface/60">{p.seed}</td>
              <td className="p-4 text-on-surface/60">
                {p.wins}&ndash;{p.losses}
              </td>
              <td className="p-4 font-mono text-on-surface">{p.points}</td>
              <td className="p-4">
                <RegistrationStatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
