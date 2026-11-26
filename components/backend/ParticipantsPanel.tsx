"use client";

import { useMemo, useState, useTransition } from "react";
import { Link2, Pencil, Trash2, Unlink } from "lucide-react";

import { InlineAlert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { LinkedAccountCell, ParticipantLinkActions, type ParticipantLinkInfo } from "@/components/dashboard/organizer/ParticipantLinkControls";
import { adminLinkParticipant, adminRemoveParticipant, adminUnlinkParticipant, adminUpdateParticipant } from "@/app/backend/participants/actions";

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
  tournamentId: string;
  tournamentTitle: string;
  seed: number;
  link: ParticipantLinkInfo | null;
}

// Mounted fresh per participant (the parent passes `key`), so the draft
// values always start from the participant being edited.
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
          <DialogDescription>Fix the name or team shown on the roster.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-5 pb-1">
          <FormField label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Team Name" hint="Leave empty for no team.">
            <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !name.trim()} aria-busy={pending} onClick={() => onSave(name.trim() || item.name, teamName)}>
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Admin's direct "link to any registered user" dialog — separate from
// ParticipantLinkActions' Confirm/Decline, since there's no pending request
// to review here; the admin types the account's username and the link is
// created already-approved (see adminLinkParticipant).
function LinkDialog({
  item,
  onOpenChange,
  pending,
  error,
  onLink,
}: {
  item: ParticipantItem | null;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: string | null;
  onLink: (username: string) => void;
}) {
  const [username, setUsername] = useState("");

  if (!item) return null;
  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) setUsername("");
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Link to Registered User</DialogTitle>
          <DialogDescription>
            Link <span className="font-medium text-on-surface">{item.teamName ?? item.name}</span> to a registered
            account by username. The link is created already-approved.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-1">
          <FormField label="Username" required error={error}>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !username.trim()} aria-busy={pending} onClick={() => onLink(username.trim())}>
            {pending ? "Linking…" : "Link Account"}
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
  const [linking, setLinking] = useState<ParticipantItem | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
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

  function handleLink(username: string) {
    if (!linking) return;
    setLinkError(null);
    startTransition(async () => {
      const result = await adminLinkParticipant(linking.id, linking.tournamentId, username);
      if (result.status === "error") {
        setLinkError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === linking.id ? { ...r, link: result.link ?? r.link } : r)));
      setLinking(null);
    });
  }

  function handleUnlink(item: ParticipantItem) {
    if (!item.link) return;
    const linkId = item.link.id;
    setError(null);
    startTransition(async () => {
      const result = await adminUnlinkParticipant(linkId);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, link: null } : r)));
      // Unlinking a still-pending request here also has to drop it from the
      // "Pending Player Links" queue above — same underlying row, separate
      // client-side state.
      setLinks((prev) => prev.filter((l) => l.link.id !== linkId));
    });
  }

  return (
    <div className="space-y-8">
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <section aria-labelledby="pending-links" className="space-y-3">
        <h2 id="pending-links" className="label-mono text-primary">
          Pending Player Links{links.length > 0 ? ` (${links.length})` : ""}
        </h2>
        <DataTable
          caption="Pending player link requests"
          rows={links}
          rowKey={(item) => item.link.id}
          minWidth={680}
          empty={{ title: "No pending link requests", description: "Requests to link a participant to an account appear here." }}
          columns={[
            { key: "participant", header: "Participant", className: "font-medium text-on-surface", cell: (item) => item.participantLabel },
            { key: "tournament", header: "Tournament", className: "text-on-surface/60", cell: (item) => item.tournamentTitle },
            { key: "account", header: "Linked Account", cell: (item) => <LinkedAccountCell link={item.link} /> },
            {
              key: "actions",
              actions: true,
              cell: (item) => (
                <div className="flex justify-end gap-1">
                  <ParticipantLinkActions
                    participantLabel={item.participantLabel}
                    link={item.link}
                    onConfirmed={() => setLinks((prev) => prev.map((l) => (l.link.id === item.link.id ? { ...l, link: { ...l.link, status: "approved" } } : l)))}
                    onDeclined={() => setLinks((prev) => prev.filter((l) => l.link.id !== item.link.id))}
                    onError={setError}
                  />
                </div>
              ),
            },
          ]}
        />
      </section>

      <section aria-labelledby="all-participants" className="space-y-3">
        <h2 id="all-participants" className="label-mono text-on-surface/50">
          All Participants
        </h2>
        <PageToolbar
          search={
            <SearchInput
              placeholder="Search by name, team, or tournament"
              aria-label="Search participants"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          }
        />

        <DataTable
          caption="All participants"
          rows={pageRows}
          rowKey={(p) => p.id}
          minWidth={820}
          empty={{ title: "No participants found", description: "Try a different name, team or tournament." }}
          columns={[
            { key: "name", header: "Name", className: "font-medium text-on-surface", cell: (p) => p.name },
            { key: "team", header: "Team", className: "text-on-surface/60", cell: (p) => p.teamName ?? "—" },
            { key: "tournament", header: "Tournament", className: "text-on-surface/60", cell: (p) => p.tournamentTitle },
            { key: "seed", header: "Seed", className: "text-on-surface/60", cell: (p) => p.seed },
            { key: "account", header: "Linked Account", cell: (p) => <LinkedAccountCell link={p.link} /> },
            {
              key: "actions",
              actions: true,
              cell: (p) => (
                <div className="flex justify-end gap-1">
                  {p.link ? (
                    <Button variant="ghost" size="icon" tooltip="Unlink this account" aria-label={`Unlink ${p.name}`} disabled={pending} onClick={() => handleUnlink(p)}>
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      tooltip="Link to a registered user"
                      aria-label={`Link ${p.name} to a registered user`}
                      disabled={pending}
                      onClick={() => {
                        setLinkError(null);
                        setLinking(p);
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" tooltip="Edit this participant" aria-label={`Edit ${p.name}`} disabled={pending} onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" tooltip="Remove this participant" aria-label={`Remove ${p.name}`} disabled={pending} onClick={() => setRemoving(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </section>

      <EditDialog
        key={editing?.id ?? "none"}
        item={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        pending={pending}
        onSave={handleSave}
      />

      <LinkDialog
        key={linking?.id ?? "none"}
        item={linking}
        onOpenChange={(open) => !open && setLinking(null)}
        pending={pending}
        error={linkError}
        onLink={handleLink}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name ?? "participant"}?`}
        description="They're removed from this tournament's roster."
        confirmLabel="Remove Participant"
        pendingLabel="Removing…"
        pending={pending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
