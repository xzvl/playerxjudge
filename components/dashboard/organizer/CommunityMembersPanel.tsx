"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { acceptCommunityJoinRequest, removeCommunityMember } from "@/app/account/organizer/community/[slug]/members/actions";
import type { ProfileCommunityStatus } from "@/lib/types/database";

export interface CommunityMemberRow {
  id: string;
  playerName: string;
  fullName: string;
  status: ProfileCommunityStatus;
  registeredAt: string;
}

type View = "members" | "requests";

// Same search-input-over-a-table shape as ParticipantsPanel
// (app/account/organizer/participants), scoped to one community and split
// into two views: approved Members and pending Requests to Join (see
// 20250101000032_community_join_requests.sql) — Accept/Decline only make
// sense on the latter, Delete on the former.
export function CommunityMembersPanel({ slug, members }: { slug: string; members: CommunityMemberRow[] }) {
  const [rows, setRows] = useState<CommunityMemberRow[]>(members);
  const [view, setView] = useState<View>("members");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requestCount = rows.filter((r) => r.status === "pending").length;

  const filtered = useMemo(() => {
    const byView = rows.filter((r) => (view === "requests" ? r.status === "pending" : r.status === "approved"));
    const q = query.trim().toLowerCase();
    if (!q) return byView;
    return byView.filter((r) => r.playerName.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q));
  }, [rows, view, query]);

  function handleAccept(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await acceptCommunityJoinRequest(id, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    });
  }

  function handleRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeCommunityMember(id, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="requests">Requests to Join {requestCount > 0 ? `(${requestCount})` : ""}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/40" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="pl-9"
            aria-label="Search members"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Rank</th>
                <th className="p-4" scope="col">Player</th>
                <th className="p-4" scope="col">Full Name</th>
                <th className="p-4" scope="col">Registered</th>
                <th className="p-4" scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                  <td className="p-4 text-on-surface/60">{i + 1}</td>
                  <td className="p-4 font-medium text-on-surface">{r.playerName}</td>
                  <td className="p-4 text-on-surface/60">{r.fullName}</td>
                  <td className="p-4 text-on-surface/60">{formatDate(r.registeredAt)}</td>
                  <td className="p-4">
                    {r.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" tooltip="Accept this join request" disabled={pending} onClick={() => handleAccept(r.id)}>
                          Accept
                        </Button>
                        <Button variant="outline" size="sm" tooltip="Decline this join request" disabled={pending} onClick={() => handleRemove(r.id)}>
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" tooltip="Remove this member" disabled={pending} onClick={() => handleRemove(r.id)}>
                        Delete
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
          {view === "requests" ? "No pending requests to join." : "No members match your search."}
        </p>
      )}
    </div>
  );
}
