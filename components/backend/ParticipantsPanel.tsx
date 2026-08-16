"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { LinkedAccountCell, ParticipantLinkActions, type ParticipantLinkInfo } from "@/components/dashboard/organizer/ParticipantLinkControls";
import { adminRemoveParticipant, adminUpdateParticipant } from "@/app/backend/participants/actions";

const PAGE_SIZE = 30;

export interface PendingLinkItem {
  participantId: string;
  participantLabel: string;
  tournamentTitle: string;
  link: ParticipantLinkInfo;
}

export interface ParticipantItem {
  id: string;
  name: string;
  teamName: string | null;
  tournamentTitle: string;
  seed: number;
}

function EditDialog({
  item,
  onOpenChange,
  pending,
  onSave,
}: {
  item: ParticipantItem | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSave: (name: string, teamName: string) => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [teamName, setTeamName] = useState(item?.teamName ?? "");

  if (!item) return null;
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Participant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Name</label>
            <Input defaultValue={item.name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Team Name</label>
            <Input defaultValue={item.teamName ?? ""} onChange={(e) => setTeamName(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" tooltip="Save changes" disabled={pending} onClick={() => onSave(name || item.name, teamName)}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Every pending player-link request platform-wide (reuses the exact
// Confirm/Decline UI organizers already have on their own tournament's
// roster — see ParticipantLinkControls) plus a searchable, paginated view
// of every tournament_participants row for straight roster fixes/removal.
export function ParticipantsPanel({
  pendingLinks,
  participants,
}: {
  pendingLinks: PendingLinkItem[];
  participants: ParticipantItem[];
}) {
  const [links, setLinks] = useState(pendingLinks);
  const [rows, setRows] = useState(participants);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ParticipantItem | null>(null);
  const [removing, setRemoving] = useState<ParticipantItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || (r.teamName ?? "").toLowerCase().includes(q) || r.tournamentTitle.toLowerCase().includes(q));
  }, [rows, query]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSave(name: string, teamName: string) {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateParticipant(editing.id, name, teamName || null);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, name, teamName: teamName || null } : r)));
      setEditing(null);
    });
  }

  function handleRemove() {
    if (!removing) return;
    setError(null);
    startTransition(async () => {
      const result = await adminRemoveParticipant(removing.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== removing.id));
      setRemoving(null);
    });
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert" className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section>
        <h2 className="label-mono mb-4 text-primary">Pending Player Links</h2>
        {links.length === 0 ? (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            No pending link requests right now.
          </p>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/25">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <th className="p-4" scope="col">Participant</th>
                  <th className="p-4" scope="col">Tournament</th>
                  <th className="p-4" scope="col">Linked Account</th>
                  <th className="p-4" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((item) => (
                  <tr key={item.link.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-on-surface">{item.participantLabel}</td>
                    <td className="p-4 text-on-surface/60">{item.tournamentTitle}</td>
                    <td className="p-4">
                      <LinkedAccountCell link={item.link} />
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <ParticipantLinkActions
                          participantLabel={item.participantLabel}
                          link={item.link}
                          onConfirmed={() => setLinks((prev) => prev.map((l) => (l.link.id === item.link.id ? { ...l, link: { ...l.link, status: "approved" } } : l)))}
                          onDeclined={() => setLinks((prev) => prev.filter((l) => l.link.id !== item.link.id))}
                          onError={setError}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="label-mono mb-4 text-on-surface/40">All Participants</h2>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <Input
            className="w-full max-w-xs"
            placeholder="Search by name, team, or tournament..."
            aria-label="Search participants"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
        </div>

        {pageRows.length > 0 ? (
          <div className="overflow-x-auto border border-outline-variant/25">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <th className="p-4" scope="col">Name</th>
                  <th className="p-4" scope="col">Team</th>
                  <th className="p-4" scope="col">Tournament</th>
                  <th className="p-4" scope="col">Seed</th>
                  <th className="p-4" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-on-surface">{p.name}</td>
                    <td className="p-4 text-on-surface/60">{p.teamName ?? "—"}</td>
                    <td className="p-4 text-on-surface/60">{p.tournamentTitle}</td>
                    <td className="p-4 text-on-surface/60">{p.seed}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" tooltip="Edit this participant" aria-label={`Edit ${p.name}`} disabled={pending} onClick={() => setEditing(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" tooltip="Remove this participant" aria-label={`Remove ${p.name}`} disabled={pending} onClick={() => setRemoving(p)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            No participants match your search.
          </p>
        )}
      </section>

      <EditDialog item={editing} onOpenChange={(open) => !open && setEditing(null)} pending={pending} onSave={handleSave} />

      <Dialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {removing?.name}?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Remove this participant" disabled={pending} onClick={handleRemove}>
              {pending ? "Removing..." : "Remove Participant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
