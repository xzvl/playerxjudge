"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL = "all";
const PAGE_SIZE = 30;

export interface JudgeMatchRow {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  stage: string;
  round: number;
  playerAName: string;
  playerBName: string;
  result: string;
  winnerName: string;
  reportedAt: string | null;
}

type SortKey = "playerA" | "playerB" | "tournament" | "round" | "reportedAt";
type SortDir = "asc" | "desc";

// "Group A - Round 3", or just "Final Round" once out of group play — no
// per-round naming exists for the final bracket, so every non-group stage
// collapses to one label rather than a fabricated round number.
function stageRoundLabel(stage: string, round: number): string {
  return stage === "Final Stage" ? "Final Round" : `${stage} - Round ${round}`;
}

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

// Every match this judge account reported — either as the assigned judge
// (matches.judge_id) or as the tournament's organizer entering a result
// directly (see app/account/judge/match-history/page.tsx for how those two
// sets are merged). Table shape mirrors ParticipantsPanel
// (components/dashboard/organizer/ParticipantsPanel.tsx): a tournament
// filter, sortable headers, and pagination — plus a player-name search
// since a judge's own match list can span many opponents.
export function JudgeMatchHistoryPanel({
  tournaments,
  rows,
}: {
  tournaments: { id: string; title: string }[];
  rows: JudgeMatchRow[];
}) {
  const [tournamentId, setTournamentId] = useState(ALL);
  const [playerQuery, setPlayerQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("reportedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = playerQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (tournamentId !== ALL && r.tournamentId !== tournamentId) return false;
      if (query && !r.playerAName.toLowerCase().includes(query) && !r.playerBName.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, tournamentId, playerQuery]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "playerA":
          return a.playerAName.localeCompare(b.playerAName) * dir;
        case "playerB":
          return a.playerBName.localeCompare(b.playerBName) * dir;
        case "tournament":
          return a.tournamentTitle.localeCompare(b.tournamentTitle) * dir;
        case "round":
          return (a.round - b.round) * dir;
        case "reportedAt":
          return ((a.reportedAt ? new Date(a.reportedAt).getTime() : 0) - (b.reportedAt ? new Date(b.reportedAt).getTime() : 0)) * dir;
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

  function handlePlayerQueryChange(value: string) {
    setPlayerQuery(value);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            className="w-full max-w-xs"
            placeholder="Search Player A or B..."
            aria-label="Search by player name"
            value={playerQuery}
            onChange={(e) => handlePlayerQueryChange(e.target.value)}
          />
          <div className="w-full max-w-xs">
            <Combobox
              label="Tournament"
              value={tournamentId}
              onValueChange={handleTournamentChange}
              options={[{ value: ALL, label: "All Tournaments" }, ...tournaments.map((t) => ({ value: t.id, label: t.title }))]}
            />
          </div>
        </div>
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>

      {pageRows.length > 0 ? (
        <>
          {/* Below lg: one row per match. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {pageRows.map((r) => (
              <article key={r.id} className="border border-outline-variant/25 bg-surface-container-low p-4">
                <p className="font-medium">
                  <span className={r.winnerName === r.playerAName ? "text-primary" : "text-on-surface"}>{r.playerAName}</span>{" "}
                  <span className="text-on-surface/40">vs</span>{" "}
                  <span className={r.winnerName === r.playerBName ? "text-primary" : "text-on-surface"}>{r.playerBName}</span>
                </p>
                <p className="mt-1 text-sm text-on-surface/60">{r.tournamentTitle}</p>
                <p className="mt-1 text-sm text-on-surface/60">{stageRoundLabel(r.stage, r.round)}</p>
                <p className="mt-2 text-sm text-on-surface/60">
                  Result: <span className="label-mono border border-outline-variant/40 px-1.5 py-0.5 text-on-surface">{r.result}</span>
                </p>
                <p className="mt-2 text-xs text-on-surface/50">
                  Date and Time: {r.reportedAt ? `${formatDate(r.reportedAt)} · ${formatTime(r.reportedAt)}` : "—"}
                </p>
              </article>
            ))}
          </div>

          {/* lg and up: the full table. */}
          <div className="hidden overflow-x-auto border border-outline-variant/25 lg:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <SortableHeader label="Player A" active={sortKey === "playerA"} dir={sortDir} onClick={() => toggleSort("playerA")} />
                  <SortableHeader label="Player B" active={sortKey === "playerB"} dir={sortDir} onClick={() => toggleSort("playerB")} />
                  <SortableHeader label="Tournament" active={sortKey === "tournament"} dir={sortDir} onClick={() => toggleSort("tournament")} />
                  <SortableHeader label="Stage / Round" active={sortKey === "round"} dir={sortDir} onClick={() => toggleSort("round")} />
                  <th className="p-4" scope="col">Result</th>
                  <th className="p-4" scope="col">Winner</th>
                  <SortableHeader label="Reported Date Time" active={sortKey === "reportedAt"} dir={sortDir} onClick={() => toggleSort("reportedAt")} />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-on-surface">{r.playerAName}</td>
                    <td className="p-4 font-medium text-on-surface">{r.playerBName}</td>
                    <td className="p-4 text-on-surface/60">{r.tournamentTitle}</td>
                    <td className="p-4 text-on-surface/60">
                      {r.stage} · Round {r.round}
                    </td>
                    <td className="p-4 font-mono text-on-surface">{r.result}</td>
                    <td className="p-4 text-on-surface/60">{r.winnerName}</td>
                    <td className="p-4 text-on-surface/60">
                      {r.reportedAt ? `${formatDate(r.reportedAt)} · ${formatTime(r.reportedAt)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {rows.length === 0 ? "You haven't reported any matches yet." : "No matches match your filters."}
        </p>
      )}

      <div className="mt-6">
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>
    </div>
  );
}
