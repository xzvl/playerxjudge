"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Eraser,
  GripVertical,
  Pencil,
  Plus,
  Repeat,
  Search,
  Shuffle,
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LinkedAccountCell, ParticipantLinkActions, type ParticipantLinkInfo } from "@/components/dashboard/organizer/ParticipantLinkControls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { RoleActionState } from "@/lib/validations/roles";
import type { TournamentGroup, TournamentParticipant } from "@/lib/types/database";
import {
  addGroup,
  addParticipant,
  assignGroupsAutomatically,
  assignParticipantsToGroup,
  bulkAddParticipants,
  clearParticipants,
  moveParticipantToGroup,
  removeGroup,
  removeParticipant,
  reorderParticipantSeeds,
  shuffleSeeds,
  unassignParticipant,
  updateParticipant,
} from "@/app/account/organizer/tournament/[slug]/participants/actions";

interface RosterEntry {
  id: string;
  seed: number;
  name: string;
  teamName: string | null;
}

interface Group {
  id: string;
  label: string;
  participantIds: string[];
}

function toRosterEntry(p: TournamentParticipant): RosterEntry {
  return { id: p.id, seed: p.seed, name: p.name, teamName: p.team_name };
}

function buildGroups(groups: TournamentGroup[], participants: TournamentParticipant[]): Group[] {
  return groups.map((g) => ({
    id: g.id,
    label: g.label,
    participantIds: participants.filter((p) => p.group_id === g.id).map((p) => p.id),
  }));
}

function initials(name: string) {
  const parts = name
    .replace(/^Team\s+/i, "")
    .trim()
    .split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function ParticipantForm({
  isTeam,
  initialName = "",
  initialTeamName = "",
  onSubmit,
  submitLabel,
  disabled,
}: {
  isTeam: boolean;
  initialName?: string;
  initialTeamName?: string;
  onSubmit: (name: string, teamName: string | null) => void;
  submitLabel: string;
  disabled: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [teamName, setTeamName] = useState(initialTeamName);

  return (
    <div className="space-y-4 px-6 pb-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-on-surface" htmlFor="participant-name">
          {isTeam ? "Player Name" : "Name"}
        </label>
        <Input id="participant-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {isTeam ? (
        <div className="space-y-2">
          <label className="text-sm font-bold text-on-surface" htmlFor="participant-team">
            Team Name
          </label>
          <Input id="participant-team" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        </div>
      ) : null}
      <DialogFooter className="p-0 pt-2">
        <Button
          type="button"
          tooltip={`${submitLabel} this participant`}
          disabled={disabled || !name.trim() || (isTeam && !teamName.trim())}
          onClick={() => onSubmit(name.trim(), isTeam ? teamName.trim() : null)}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}

function ManageParticipantsTab({
  roster,
  isTeam,
  pending,
  tournamentStarted,
  links,
  onAdd,
  onEdit,
  onSubstitute,
  onRemove,
  onShuffle,
  onClear,
  onBulkAdd,
  onLinkConfirmed,
  onLinkDeclined,
  onLinkError,
}: {
  roster: RosterEntry[];
  isTeam: boolean;
  pending: boolean;
  tournamentStarted: boolean;
  links: Map<string, ParticipantLinkInfo>;
  onAdd: (name: string, teamName: string | null) => void;
  onEdit: (id: string, name: string, teamName: string | null) => void;
  onSubstitute: (id: string, name: string, teamName: string | null) => void;
  onRemove: (id: string) => void;
  onShuffle: () => void;
  onClear: () => void;
  onBulkAdd: (names: string[]) => void;
  onLinkConfirmed: (participantId: string) => void;
  onLinkDeclined: (participantId: string) => void;
  onLinkError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [editing, setEditing] = useState<RosterEntry | null>(null);
  const [substituting, setSubstituting] = useState<RosterEntry | null>(null);

  const visible = roster.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || (r.teamName ?? "").toLowerCase().includes(q);
  });

  const bulkCount = bulkText
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/30" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participants..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-1.5"
                tooltip={tournamentStarted ? "Can't add participants once the tournament has started" : "Add a single participant to the roster"}
                disabled={tournamentStarted}
              >
                <UserPlus className="h-3.5 w-3.5" /> Add Participant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Participant</DialogTitle>
                <DialogDescription>Adds a new entry to the roster with the next open seed.</DialogDescription>
              </DialogHeader>
              <ParticipantForm
                isTeam={isTeam}
                submitLabel="Add"
                disabled={pending}
                onSubmit={(name, teamName) => {
                  onAdd(name, teamName);
                  setAddOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            tooltip={tournamentStarted ? "Can't clear the roster once the tournament has started" : "Remove every participant from the roster"}
            disabled={pending || tournamentStarted || roster.length === 0}
            onClick={() => setClearOpen(true)}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            tooltip={tournamentStarted ? "Can't reshuffle seeds once the tournament has started" : "Randomize everyone's seed"}
            disabled={pending || tournamentStarted}
            onClick={onShuffle}
          >
            <Shuffle className="h-3.5 w-3.5" /> Shuffle
          </Button>

          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                tooltip={tournamentStarted ? "Can't add participants once the tournament has started" : "Add several participants at once, one per line"}
                disabled={tournamentStarted}
              >
                <Plus className="h-3.5 w-3.5" /> Bulk Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Add Participants</DialogTitle>
                <DialogDescription>One {isTeam ? "team" : "name"} per line.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 px-6 pb-6">
                <Textarea
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={isTeam ? "Team Voltbreak\nTeam Overdrive" : "J. Reyes\nM. Santos"}
                />
                <DialogFooter className="p-0">
                  <Button
                    type="button"
                    tooltip="Add every line above as a participant"
                    disabled={pending || !bulkText.trim()}
                    onClick={() => {
                      const names = bulkText
                        .split("\n")
                        .map((n) => n.trim())
                        .filter(Boolean);
                      onBulkAdd(names);
                      setBulkText("");
                      setBulkOpen(false);
                    }}
                  >
                    Add {bulkCount || ""} Participant{bulkCount === 1 ? "" : "s"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {visible.length > 0 ? (
        <div className="overflow-x-auto border border-outline-variant/25">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                <th className="p-4" scope="col">Seed</th>
                <th className="p-4" scope="col">Participant</th>
                <th className="p-4" scope="col">Linked Account</th>
                <th className="p-4" scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const link = links.get(r.id) ?? null;
                return (
                  <tr key={r.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 py-1 font-mono text-on-surface/60">{r.seed}</td>
                    <td className="p-4 py-1 font-medium text-on-surface">{r.teamName ?? r.name}</td>
                    <td className="p-4 py-1">
                      <LinkedAccountCell link={link} />
                    </td>
                    <td className="p-4 py-1">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex gap-1">
                          <ParticipantLinkActions
                            participantLabel={r.teamName ?? r.name}
                            link={link}
                            onConfirmed={() => onLinkConfirmed(r.id)}
                            onDeclined={() => onLinkDeclined(r.id)}
                            onError={onLinkError}
                          />
                          <Button variant="ghost" size="icon" disabled={pending} aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            aria-label={`Substitute ${r.name}`}
                            tooltip="Replace this participant with someone new"
                            onClick={() => setSubstituting(r)}
                          >
                            <Repeat className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending || tournamentStarted}
                            aria-label={`Remove ${r.name}`}
                            tooltip={tournamentStarted ? "Can't remove once the tournament has started" : "Remove this participant"}
                            onClick={() => onRemove(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {roster.length === 0 ? "No one has registered yet." : "No participants match your search."}
        </p>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Participant</DialogTitle>
            <DialogDescription>Seed {editing?.seed} stays the same.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <ParticipantForm
              isTeam={isTeam}
              initialName={editing.name}
              initialTeamName={editing.teamName ?? ""}
              submitLabel="Save"
              disabled={pending}
              onSubmit={(name, teamName) => {
                onEdit(editing.id, name, teamName);
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={substituting !== null} onOpenChange={(open) => !open && setSubstituting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Substitute Participant</DialogTitle>
            <DialogDescription>
              Replaces {substituting?.name} at seed {substituting?.seed} with someone new.
            </DialogDescription>
          </DialogHeader>
          {substituting ? (
            <ParticipantForm
              isTeam={isTeam}
              submitLabel="Substitute"
              disabled={pending}
              onSubmit={(name, teamName) => {
                onSubstitute(substituting.id, name, teamName);
                setSubstituting(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all participants?</DialogTitle>
            <DialogDescription>
              This removes all {roster.length} participant{roster.length === 1 ? "" : "s"} from the roster, along with
              any group assignments. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="outline" tooltip="Keep the current roster" disabled={pending} onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              tooltip="This can't be undone"
              disabled={pending}
              onClick={() => {
                onClear();
                setClearOpen(false);
              }}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignParticipantsDialog({
  open,
  onOpenChange,
  candidates,
  pending,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: RosterEntry[];
  pending: boolean;
  onAssign: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected(new Set());
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Participants</DialogTitle>
          <DialogDescription>Pick who joins this group.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto px-6 pb-2">
          {candidates.length > 0 ? (
            candidates.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 border border-transparent px-2 py-2 text-sm hover:border-outline-variant/30"
              >
                <Checkbox checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                <span className="font-mono text-xs text-on-surface/40">#{c.seed}</span>
                <span className="text-on-surface">{c.teamName ?? c.name}</span>
              </label>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-on-surface/50">Everyone is already assigned to a group.</p>
          )}
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button
            type="button"
            tooltip="Add the selected participants to this group"
            disabled={pending || selected.size === 0}
            onClick={() => {
              onAssign([...selected]);
              setSelected(new Set());
              onOpenChange(false);
            }}
          >
            Assign {selected.size > 0 ? selected.size : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveToGroupDialog({
  open,
  onOpenChange,
  participantName,
  otherGroups,
  pending,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantName: string | null;
  otherGroups: { id: string; label: string }[];
  pending: boolean;
  onMove: (toGroupId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Group</DialogTitle>
          <DialogDescription>{participantName ? `Move ${participantName} to a different group.` : null}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 pb-6">
          {otherGroups.length > 0 ? (
            otherGroups.map((g) => (
              <Button
                key={g.id}
                type="button"
                variant="outline"
                className="w-full justify-start"
                tooltip={`Move to Group ${g.label}`}
                disabled={pending}
                onClick={() => onMove(g.id)}
              >
                Group {g.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-on-surface/50">No other groups to move to.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({
  group,
  members,
  otherGroups,
  unassigned,
  pending,
  tournamentStarted,
  onRemoveGroup,
  onAssign,
  onUnassign,
  onMove,
  onReorder,
}: {
  group: Group;
  members: RosterEntry[];
  otherGroups: { id: string; label: string }[];
  unassigned: RosterEntry[];
  pending: boolean;
  tournamentStarted: boolean;
  onRemoveGroup: () => void;
  onAssign: (ids: string[]) => void;
  onUnassign: (id: string) => void;
  onMove: (id: string, toGroupId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const movingParticipant = members.find((m) => m.id === movingId) ?? null;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    const fromId = draggedId;
    setDraggedId(null);
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;

    const ids = members.map((m) => m.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...ids];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, fromId);
    onReorder(reordered);
  }

  return (
    <div className="border border-outline-variant/25">
      <div className="flex items-center justify-between gap-2 border-b border-outline-variant/25 bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <p className="heading text-lg">Group {group.label}</p>
          <span className="label-mono text-on-surface/40">
            {members.length} participant{members.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            tooltip={tournamentStarted ? "Can't reassign groups once the tournament has started" : "Pick who joins this group"}
            disabled={pending || tournamentStarted}
            onClick={() => setAssignOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" /> Assign Participants
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending || tournamentStarted}
            aria-label={`Remove Group ${group.label}`}
            tooltip={tournamentStarted ? "Can't remove a group once the tournament has started" : "Remove this group"}
            onClick={onRemoveGroup}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {members.length > 0 ? (
        <ul>
          {members.map((m, i) => (
            <li
              key={m.id}
              draggable={!pending && !tournamentStarted}
              onDragStart={(e) => {
                setDraggedId(m.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnter={() => draggedId && setDragOverId(m.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(m.id);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={`flex items-center gap-3 border-b border-outline-variant/15 px-4 py-2.5 last:border-0 hover:bg-white/[0.02] ${
                draggedId === m.id ? "opacity-40" : ""
              } ${dragOverId === m.id && draggedId && draggedId !== m.id ? "bg-primary/10" : ""}`}
            >
              <GripVertical
                className={`h-4 w-4 shrink-0 text-on-surface/25 ${tournamentStarted ? "cursor-not-allowed" : "cursor-grab"}`}
                aria-hidden="true"
              />
              <span className="w-5 shrink-0 font-mono text-xs text-on-surface/40">{i + 1}</span>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(m.teamName ?? m.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm text-on-surface">{m.teamName ?? m.name}</span>
              <Badge variant="outline">Seed {m.seed}</Badge>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${m.name} to another group`}
                  disabled={pending || otherGroups.length === 0}
                  onClick={() => setMovingId(m.id)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending || tournamentStarted}
                  aria-label={`Remove ${m.name} from group`}
                  tooltip={tournamentStarted ? "Can't remove from a group once the tournament has started" : "Remove this participant from the group"}
                  onClick={() => onUnassign(m.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-6 text-center text-sm text-on-surface/50">No participants assigned yet.</p>
      )}

      <AssignParticipantsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        candidates={unassigned}
        pending={pending}
        onAssign={onAssign}
      />
      <MoveToGroupDialog
        open={movingId !== null}
        onOpenChange={(open) => !open && setMovingId(null)}
        participantName={movingParticipant?.teamName ?? movingParticipant?.name ?? null}
        otherGroups={otherGroups}
        pending={pending}
        onMove={(toGroupId) => {
          if (movingId) onMove(movingId, toGroupId);
          setMovingId(null);
        }}
      />
    </div>
  );
}

function ManageGroupsTab({
  roster,
  groups,
  pending,
  tournamentStarted,
  onAssignAutomatically,
  onAddGroup,
  onRemoveGroup,
  onAssign,
  onUnassign,
  onMove,
  onReorder,
}: {
  roster: RosterEntry[];
  groups: Group[];
  pending: boolean;
  tournamentStarted: boolean;
  onAssignAutomatically: () => void;
  onAddGroup: () => void;
  onRemoveGroup: (groupId: string) => void;
  onAssign: (groupId: string, ids: string[]) => void;
  onUnassign: (groupId: string, id: string) => void;
  onMove: (fromGroupId: string, id: string, toGroupId: string) => void;
  onReorder: (groupId: string, orderedIds: string[]) => void;
}) {
  const rosterById = new Map(roster.map((r) => [r.id, r]));
  const assignedIds = new Set(groups.flatMap((g) => g.participantIds));
  const unassigned = roster.filter((r) => !assignedIds.has(r.id));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface/50">
          {unassigned.length > 0
            ? `${unassigned.length} unassigned participant${unassigned.length === 1 ? "" : "s"}`
            : "Everyone is assigned to a group."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            tooltip={
              tournamentStarted
                ? "Can't reassign groups once the tournament has started"
                : "Distribute unassigned participants across groups automatically"
            }
            disabled={pending || tournamentStarted}
            onClick={onAssignAutomatically}
          >
            <Wand2 className="h-3.5 w-3.5" /> Assign Groups Automatically
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            tooltip={tournamentStarted ? "Can't add a group once the tournament has started" : "Create a new empty group"}
            disabled={pending || tournamentStarted}
            onClick={onAddGroup}
          >
            <Plus className="h-3.5 w-3.5" /> Add Group
          </Button>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              members={group.participantIds.map((id) => rosterById.get(id)).filter((r): r is RosterEntry => !!r)}
              otherGroups={groups.filter((g) => g.id !== group.id).map((g) => ({ id: g.id, label: g.label }))}
              unassigned={unassigned}
              pending={pending}
              tournamentStarted={tournamentStarted}
              onRemoveGroup={() => onRemoveGroup(group.id)}
              onAssign={(ids) => onAssign(group.id, ids)}
              onUnassign={(id) => onUnassign(group.id, id)}
              onMove={(id, toGroupId) => onMove(group.id, id, toGroupId)}
              onReorder={(orderedIds) => onReorder(group.id, orderedIds)}
            />
          ))}
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No groups yet — assign automatically or add one to get started.
        </p>
      )}
    </div>
  );
}

export function TournamentParticipantsWorkspace({
  tournamentId,
  slug,
  initialParticipants,
  initialGroups,
  initialLinks,
  isTwoStage,
  isTeam,
  participantsPerGroup,
  tournamentStarted,
}: {
  tournamentId: string;
  slug: string;
  initialParticipants: TournamentParticipant[];
  initialGroups: TournamentGroup[];
  initialLinks: { participantId: string; link: ParticipantLinkInfo }[];
  isTwoStage: boolean;
  isTeam: boolean;
  participantsPerGroup: number;
  tournamentStarted: boolean;
}) {
  const searchParams = useSearchParams();
  const defaultTab = isTwoStage && searchParams.get("tab") === "groups" ? "groups" : "participants";

  const [roster, setRoster] = useState<RosterEntry[]>(initialParticipants.map(toRosterEntry));
  const [groups, setGroups] = useState<Group[]>(buildGroups(initialGroups, initialParticipants));
  const [links, setLinks] = useState<Map<string, ParticipantLinkInfo>>(
    new Map(initialLinks.map((l) => [l.participantId, l.link]))
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLinkConfirmed(participantId: string) {
    setLinks((prev) => {
      const current = prev.get(participantId);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(participantId, { ...current, status: "approved" });
      return next;
    });
  }

  function handleLinkDeclined(participantId: string) {
    setLinks((prev) => {
      if (!prev.has(participantId)) return prev;
      const next = new Map(prev);
      next.delete(participantId);
      return next;
    });
  }

  function run<T>(action: () => Promise<RoleActionState & T>, onSuccess: (result: RoleActionState & T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      onSuccess(result);
    });
  }

  function handleAdd(name: string, teamName: string | null) {
    run(
      () => addParticipant(tournamentId, slug, name, teamName),
      (result) => {
        if (result.participant) setRoster((prev) => [...prev, toRosterEntry(result.participant!)].sort((a, b) => a.seed - b.seed));
      }
    );
  }

  function handleBulkAdd(names: string[]) {
    run(
      () => bulkAddParticipants(tournamentId, slug, names, isTeam),
      (result) => {
        if (result.participants) {
          setRoster((prev) => [...prev, ...result.participants!.map(toRosterEntry)].sort((a, b) => a.seed - b.seed));
        }
        // A pasted "<username>" tag (see parseBulkLine, bulkAddParticipants)
        // auto-links straight to "approved" server-side — without this, the
        // new rows read "Not linked" until a full page reload, since
        // `links` is local state seeded once from the initial page load and
        // nothing else refreshes it after a bulk add.
        if (result.links && result.links.length > 0) {
          setLinks((prev) => {
            const next = new Map(prev);
            for (const { participantId, link } of result.links!) next.set(participantId, link);
            return next;
          });
        }
      }
    );
  }

  function handleEdit(id: string, name: string, teamName: string | null) {
    run(
      () => updateParticipant(id, slug, name, teamName),
      (result) => {
        if (result.participant) setRoster((prev) => prev.map((r) => (r.id === id ? toRosterEntry(result.participant!) : r)));
      }
    );
  }

  function handleRemove(id: string) {
    run(
      () => removeParticipant(id, slug),
      (result) => {
        // Everyone seeded after the removed participant shifts down by one
        // to close the gap (see removeParticipant) — reconcile those seed
        // numbers locally the same way handleReorder does.
        const shifted = new Map((result.participants ?? []).map((p) => [p.id, p]));
        setRoster((prev) =>
          prev.filter((r) => r.id !== id).map((r) => (shifted.has(r.id) ? toRosterEntry(shifted.get(r.id)!) : r))
        );
        setGroups((prev) => prev.map((g) => ({ ...g, participantIds: g.participantIds.filter((pid) => pid !== id) })));
      }
    );
  }

  function handleClear() {
    run(
      () => clearParticipants(tournamentId, slug),
      () => {
        setRoster([]);
        setGroups((prev) => prev.map((g) => ({ ...g, participantIds: [] })));
      }
    );
  }

  function handleShuffle() {
    run(
      () => shuffleSeeds(tournamentId, slug),
      (result) => {
        if (result.participants) setRoster(result.participants.map(toRosterEntry));
      }
    );
  }

  function handleAssignGroupsAutomatically() {
    run(
      () => assignGroupsAutomatically(tournamentId, slug, participantsPerGroup),
      (result) => {
        if (result.groups && result.participants) {
          setGroups(buildGroups(result.groups, result.participants));
        }
      }
    );
  }

  function handleAddGroup() {
    run(
      () => addGroup(tournamentId, slug),
      (result) => {
        if (result.group) setGroups((prev) => [...prev, { id: result.group!.id, label: result.group!.label, participantIds: [] }]);
      }
    );
  }

  function handleRemoveGroup(groupId: string) {
    run(
      () => removeGroup(groupId, slug),
      () => setGroups((prev) => prev.filter((g) => g.id !== groupId))
    );
  }

  function handleAssignToGroup(groupId: string, ids: string[]) {
    run(
      () => assignParticipantsToGroup(groupId, slug, ids),
      () => setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, participantIds: [...g.participantIds, ...ids] } : g)))
    );
  }

  function handleUnassign(groupId: string, participantId: string) {
    run(
      () => unassignParticipant(participantId, slug),
      () =>
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, participantIds: g.participantIds.filter((pid) => pid !== participantId) } : g))
        )
    );
  }

  function handleMove(fromGroupId: string, participantId: string, toGroupId: string) {
    run(
      () => moveParticipantToGroup(participantId, slug, toGroupId),
      () =>
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === fromGroupId) return { ...g, participantIds: g.participantIds.filter((pid) => pid !== participantId) };
            if (g.id === toGroupId) return { ...g, participantIds: [...g.participantIds, participantId] };
            return g;
          })
        )
    );
  }

  function handleReorder(groupId: string, orderedIds: string[]) {
    // Optimistic — apply the drop immediately so the list doesn't snap back
    // while the request is in flight, then reconcile seed numbers once the
    // server responds. Reverts the group order if the save fails.
    const previousGroups = groups;
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, participantIds: orderedIds } : g)));
    setError(null);
    startTransition(async () => {
      const result = await reorderParticipantSeeds(slug, orderedIds);
      if (result.status === "error") {
        setGroups(previousGroups);
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.participants) {
        const updated = new Map(result.participants.map((p) => [p.id, p]));
        setRoster((prev) => prev.map((r) => (updated.has(r.id) ? toRosterEntry(updated.get(r.id)!) : r)));
      }
    });
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="participants" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Manage Participants
          </TabsTrigger>
          {isTwoStage ? (
            <TabsTrigger value="groups" className="gap-1.5">
              <Wand2 className="h-3.5 w-3.5" /> Manage Groups
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="participants">
          <ManageParticipantsTab
            roster={roster}
            isTeam={isTeam}
            pending={pending}
            tournamentStarted={tournamentStarted}
            links={links}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onSubstitute={handleEdit}
            onRemove={handleRemove}
            onShuffle={handleShuffle}
            onClear={handleClear}
            onBulkAdd={handleBulkAdd}
            onLinkConfirmed={handleLinkConfirmed}
            onLinkDeclined={handleLinkDeclined}
            onLinkError={setError}
          />
        </TabsContent>

        {isTwoStage ? (
          <TabsContent value="groups">
            <ManageGroupsTab
              roster={roster}
              groups={groups}
              pending={pending}
              tournamentStarted={tournamentStarted}
              onAssignAutomatically={handleAssignGroupsAutomatically}
              onAddGroup={handleAddGroup}
              onRemoveGroup={handleRemoveGroup}
              onAssign={handleAssignToGroup}
              onUnassign={handleUnassign}
              onMove={handleMove}
              onReorder={handleReorder}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
