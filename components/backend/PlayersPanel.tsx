"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { setPlayerBanned } from "@/app/backend/players/actions";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 30;

export interface PlayerRow {
  id: string;
  displayName: string;
  username: string;
  province: string | null;
  isBanned: boolean;
  joinedAt: string;
}

export function PlayersPanel({ players }: { players: PlayerRow[] }) {
  const [rows, setRows] = useState(players);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [banning, setBanning] = useState<PlayerRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.displayName.toLowerCase().includes(q) || r.username.toLowerCase().includes(q));
  }, [rows, query]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function handleBan() {
    if (!banning) return;
    setError(null);
    startTransition(async () => {
      const result = await setPlayerBanned(banning.id, true);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === banning.id ? { ...r, isBanned: true } : r)));
      setBanning(null);
    });
  }

  function handleUnban(row: PlayerRow) {
    setError(null);
    startTransition(async () => {
      const result = await setPlayerBanned(row.id, false);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isBanned: false } : r)));
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Input
          className="w-full max-w-xs"
          placeholder="Search by name or username..."
          aria-label="Search players"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {pageRows.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Player</th>
                <th className="p-4" scope="col">Province</th>
                <th className="p-4" scope="col">Joined</th>
                <th className="p-4" scope="col">Status</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{r.displayName}</p>
                    <p className="text-xs text-on-surface/40">@{r.username}</p>
                  </td>
                  <td className="p-4 text-on-surface/60">{r.province ?? "—"}</td>
                  <td className="p-4 text-on-surface/60">{formatDate(r.joinedAt)}</td>
                  <td className="p-4">
                    <Badge variant={r.isBanned ? "destructive" : "success"}>{r.isBanned ? "Banned" : "Active"}</Badge>
                  </td>
                  <td className="p-4">
                    {r.isBanned ? (
                      <Button variant="ghost" size="icon" tooltip="Unban this player" aria-label={`Unban ${r.displayName}`} disabled={pending} onClick={() => handleUnban(r)}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" tooltip="Ban this player" aria-label={`Ban ${r.displayName}`} disabled={pending} onClick={() => setBanning(r)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No players match your search.
        </p>
      )}

      <div className="mt-6">
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>

      <Dialog open={banning !== null} onOpenChange={(open) => !open && setBanning(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ban {banning?.displayName}?</DialogTitle>
            <DialogDescription>
              They&apos;ll be signed out and unable to sign back in until unbanned. This doesn&apos;t delete their account
              or data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Ban this player" disabled={pending} onClick={handleBan}>
              {pending ? "Banning..." : "Ban Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
