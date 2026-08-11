"use client";

import { useMemo, useState } from "react";

import { Combobox } from "@/components/ui/combobox";
import { RegistrationStatusBadge } from "@/components/dashboard/organizer/badges";
import { formatDate } from "@/lib/format";
import { MOCK_ORGANIZED_TOURNAMENTS, MOCK_ORGANIZER_REGISTRATIONS } from "@/lib/mock/organizer-dashboard";

const ALL = "all";

export function ParticipantsPanel() {
  const [tournamentId, setTournamentId] = useState(ALL);
  const [status, setStatus] = useState(ALL);

  const tournamentById = useMemo(
    () => new Map(MOCK_ORGANIZED_TOURNAMENTS.map((t) => [t.id, t])),
    []
  );

  const filtered = MOCK_ORGANIZER_REGISTRATIONS.filter((r) => {
    if (tournamentId !== ALL && r.tournamentId !== tournamentId) return false;
    if (status !== ALL && r.status !== status) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 sm:max-w-md">
        <Combobox
          label="Tournament"
          value={tournamentId}
          onValueChange={setTournamentId}
          options={[
            { value: ALL, label: "All Tournaments" },
            ...MOCK_ORGANIZED_TOURNAMENTS.map((t) => ({ value: t.id, label: t.title })),
          ]}
        />
        <Combobox
          label="Status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: ALL, label: "All Statuses" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "checked_in", label: "Checked In" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Player</th>
                <th className="p-4" scope="col">Team</th>
                <th className="p-4" scope="col">Tournament</th>
                <th className="p-4" scope="col">Seed</th>
                <th className="p-4" scope="col">Status</th>
                <th className="p-4" scope="col">Registered</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">{r.playerName}</td>
                  <td className="p-4 text-on-surface/60">{r.teamName ?? "—"}</td>
                  <td className="p-4 text-on-surface/60">{tournamentById.get(r.tournamentId)?.title ?? "—"}</td>
                  <td className="p-4 text-on-surface/60">{r.seed ?? "—"}</td>
                  <td className="p-4">
                    <RegistrationStatusBadge status={r.status} />
                  </td>
                  <td className="p-4 text-on-surface/60">{formatDate(r.registeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No participants match your filters.
        </p>
      )}
    </div>
  );
}
