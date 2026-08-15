"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import { Pagination } from "@/components/ui/pagination";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL = "all";
const PAGE_SIZE = 30;

export interface ParticipantRow {
  id: string;
  playerName: string;
  teamName: string | null;
  tournamentId: string;
  tournamentTitle: string;
  seed: number;
  groupLabel: string | null;
  registeredAt: string;
}

type SortKey = "player" | "team" | "tournament" | "seed" | "group" | "registered";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="p-4" scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "label-mono flex items-center gap-1.5 transition-colors hover:text-on-surface",
          active ? "text-primary" : "text-on-surface/40"
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}

// Live roster across every tournament this organizer runs — one row per
// `tournament_participants` row (see app/account/organizer/participants/page.tsx).
// There's no per-participant registration status to filter by yet (that
// workflow — pending/confirmed/checked-in — was never wired up to real
// data; see the removed Check-in page), so Tournament is the only filter
// here for now.
export function ParticipantsPanel({
  tournaments,
  participants,
}: {
  tournaments: { id: string; title: string }[];
  participants: ParticipantRow[];
}) {
  const [tournamentId, setTournamentId] = useState(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("registered");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (tournamentId === ALL ? participants : participants.filter((p) => p.tournamentId === tournamentId)),
    [participants, tournamentId]
  );

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "player":
          return a.playerName.localeCompare(b.playerName) * dir;
        case "team":
          return (a.teamName ?? "").localeCompare(b.teamName ?? "") * dir;
        case "tournament":
          return a.tournamentTitle.localeCompare(b.tournamentTitle) * dir;
        case "seed":
          return (a.seed - b.seed) * dir;
        case "group":
          return (a.groupLabel ?? "").localeCompare(b.groupLabel ?? "") * dir;
        case "registered":
          return (new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime()) * dir;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const lastPage = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleTournamentChange(value: string) {
    setTournamentId(value);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xs flex-1">
          <Combobox
            label="Tournament"
            value={tournamentId}
            onValueChange={handleTournamentChange}
            options={[{ value: ALL, label: "All Tournaments" }, ...tournaments.map((t) => ({ value: t.id, label: t.title }))]}
          />
        </div>
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>

      {pageRows.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <SortableHeader label="Player" active={sortKey === "player"} dir={sortDir} onClick={() => toggleSort("player")} />
                <SortableHeader label="Team" active={sortKey === "team"} dir={sortDir} onClick={() => toggleSort("team")} />
                <SortableHeader label="Tournament" active={sortKey === "tournament"} dir={sortDir} onClick={() => toggleSort("tournament")} />
                <SortableHeader label="Seed" active={sortKey === "seed"} dir={sortDir} onClick={() => toggleSort("seed")} />
                <SortableHeader label="Group" active={sortKey === "group"} dir={sortDir} onClick={() => toggleSort("group")} />
                <SortableHeader label="Registered" active={sortKey === "registered"} dir={sortDir} onClick={() => toggleSort("registered")} />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 font-medium text-on-surface">{r.playerName}</td>
                  <td className="p-4 text-on-surface/60">{r.teamName ?? "—"}</td>
                  <td className="p-4 text-on-surface/60">{r.tournamentTitle}</td>
                  <td className="p-4 text-on-surface/60">{r.seed}</td>
                  <td className="p-4 text-on-surface/60">{r.groupLabel ? `Group ${r.groupLabel}` : "—"}</td>
                  <td className="p-4 text-on-surface/60">{formatDate(r.registeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {tournaments.length === 0 ? "You don't have any tournaments yet." : "No participants match your filter."}
        </p>
      )}

      <div className="mt-6">
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>
    </div>
  );
}
