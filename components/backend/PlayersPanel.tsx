"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, Mail, ShieldCheck } from "lucide-react";

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
  // 'email' | 'google' | null (null = created before this was tracked,
  // reads as "Email" — see app/backend/players/page.tsx).
  provider: string | null;
  joinedAt: string;
}

// Matches Google's "G" wordmark colors closely enough to read as "Google" at
// a glance next to the Email icon, without pulling in a whole brand icon set
// for one badge.
function ProviderBadge({ provider }: { provider: string | null }) {
  if (provider === "google") {
    return (
      <span className="inline-flex items-center gap-1.5 text-on-surface/60">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-on-surface/60">
      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Email
    </span>
  );
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
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Player</th>
                <th className="p-4" scope="col">Signed Up With</th>
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
                  <td className="p-4 text-sm">
                    <ProviderBadge provider={r.provider} />
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
