"use client";

import { useEffect, useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { inviteToTeam, searchPlayersToInvite, type InviteCandidate } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { NativeSelect } from "@/components/ui/native-select";
import { PlayerCell } from "@/components/dashboard/team/team-ui";
import { FormStatus } from "@/components/dashboard/team/FormField";
import { TEAM_ROLE_LABEL } from "@/lib/teams/constants";
import type { TeamRole } from "@/lib/types/database";

export function InvitePlayerForm({ teamId, canAppointSubCaptain }: { teamId: string; canAppointSubCaptain: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InviteCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [role, setRole] = useState<TeamRole>("member");
  const [status, setStatus] = useState<{ status: "success" | "error"; message?: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useBusyTransition();

  // Debounced search; ignores responses for stale queries.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchPlayersToInvite(teamId, q);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, teamId]);

  const invite = (candidate: InviteCandidate) => {
    setPendingId(candidate.id);
    startTransition(async () => {
      const result = await inviteToTeam(teamId, candidate.id, role);
      setPendingId(null);
      if (result.status === "error") {
        setStatus({ status: "error", message: result.message });
        return;
      }
      setStatus({ status: "success", message: `Invite sent to ${candidate.displayName}.` });
      setResults((prev) => prev.filter((r) => r.id !== candidate.id));
      router.refresh();
    });
  };

  const roleOptions: TeamRole[] = canAppointSubCaptain ? ["member", "sub_captain", "filler"] : ["member", "filler"];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name"
            aria-label="Search players to invite"
          />
          {searching ? (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-on-surface/40" aria-hidden="true" />
          ) : null}
        </div>
        <div className="sm:w-40">
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value as TeamRole)} aria-label="Role for the invite">
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                Invite as {TEAM_ROLE_LABEL[r]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {query.trim().length >= 2 && !searching ? (
        results.length > 0 ? (
          <ul className="divide-y divide-outline-variant/15 rounded-md border border-outline-variant/25">
            {results.map((candidate) => (
              <li key={candidate.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <PlayerCell
                  profile={{
                    id: candidate.id,
                    username: candidate.username,
                    displayName: candidate.displayName,
                    avatarUrl: candidate.avatarUrl,
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => invite(candidate)} disabled={pendingId === candidate.id}>
                  <UserPlus /> {pendingId === candidate.id ? "Inviting…" : "Invite"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-on-surface/50">No players found who aren&apos;t already on the team or invited.</p>
        )
      ) : null}

      <FormStatus status={status?.status ?? null} message={status?.message} />
    </div>
  );
}
