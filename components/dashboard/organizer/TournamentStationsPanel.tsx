"use client";

import { useState, useTransition } from "react";
import { Gavel, Plus, Radio, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { AddJudgeCombobox } from "@/components/dashboard/organizer/AddJudgeCombobox";
import { JudgeAssignmentStatusBadge } from "@/components/dashboard/organizer/badges";
import { addStation, assignStationMatch, removeStation } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import {
  assignJudgeToStation,
  inviteJudge,
  removeJudge,
  unassignJudgeFromStation,
} from "@/app/account/organizer/tournament/[slug]/judges-actions";
import { cn } from "@/lib/utils";
import type { JudgeAssignmentStatus, TournamentStationStatus } from "@/lib/types/database";

export interface StationItem {
  id: string;
  name: string;
  status: TournamentStationStatus;
  currentMatchId: string | null;
}

export interface JudgeItem {
  id: string; // `judges` row id — this is what drag payloads and every judge action carry.
  judgeId: string; // profiles.id
  name: string;
  avatarUrl: string | null;
  status: JudgeAssignmentStatus;
  stationId: string | null;
}

export interface AvailableJudge {
  id: string; // profiles.id
  displayName: string;
  username: string;
}

const STATUS_VARIANTS: Record<TournamentStationStatus, BadgeProps["variant"]> = {
  idle: "outline",
  in_progress: "success",
  complete: "secondary",
};

const STATUS_LABELS: Record<TournamentStationStatus, string> = {
  idle: "Idle",
  in_progress: "In Progress",
  complete: "Free",
};

const NO_MATCH = "";
const JUDGE_DRAG_TYPE = "application/x-judge-row-id";

function initials(name: string) {
  const parts = name.replace(/^Team\s+/i, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function TournamentStationsPanel({
  tournamentId,
  tournamentTitle,
  slug,
  stations: initialStations,
  matchOptions,
  judges: initialJudges,
  availableJudges,
}: {
  tournamentId: string;
  tournamentTitle: string;
  slug: string;
  stations: StationItem[];
  matchOptions: ComboboxOption[];
  judges: JudgeItem[];
  availableJudges: AvailableJudge[];
}) {
  const [stations, setStations] = useState<StationItem[]>(initialStations);
  const [judges, setJudges] = useState<JudgeItem[]>(initialJudges);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOverStationId, setDragOverStationId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matchLabel = (id: string | null) => (id ? matchOptions.find((m) => m.value === id)?.label ?? "Unknown match" : "No match assigned");
  const judgeAtStation = (stationId: string) => judges.find((j) => j.stationId === stationId) ?? null;

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await addStation(tournamentId, slug, trimmed);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.station) {
        setStations((prev) => [
          ...prev,
          { id: result.station!.id, name: result.station!.name, status: result.station!.status, currentMatchId: result.station!.current_match_id },
        ]);
      }
      setName("");
    });
  }

  function handleAssign(stationId: string, matchId: string) {
    setError(null);
    startTransition(async () => {
      const result = await assignStationMatch(stationId, slug, matchId || null);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setStations((prev) =>
        prev.map((s) => (s.id === stationId ? { ...s, currentMatchId: matchId || null, status: matchId ? "in_progress" : "idle" } : s))
      );
    });
  }

  function handleRemoveStation(stationId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeStation(stationId, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setStations((prev) => prev.filter((s) => s.id !== stationId));
    });
  }

  function handleInviteJudge(judgeId: string) {
    setError(null);
    startTransition(async () => {
      const result = await inviteJudge(tournamentId, slug, judgeId, tournamentTitle);
      // A "judge added, but they weren't notified" failure still comes back
      // with `judge` set — reflect the roster addition either way, and only
      // skip it if the invite failed outright (no row was ever created).
      if (result.message) setError(result.message);
      if (result.judge) {
        const option = availableJudges.find((a) => a.id === judgeId);
        setJudges((prev) => [
          ...prev,
          {
            id: result.judge!.id,
            judgeId,
            name: option?.displayName ?? "Judge",
            avatarUrl: null,
            status: result.judge!.status,
            stationId: null,
          },
        ]);
      }
    });
  }

  function handleRemoveJudge(judgeRowId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeJudge(judgeRowId, slug);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setJudges((prev) => prev.filter((j) => j.id !== judgeRowId));
    });
  }

  function handleDropOnStation(stationId: string, judgeRowId: string) {
    setDragOverStationId(null);
    if (!judgeRowId) return;
    const dragged = judges.find((j) => j.id === judgeRowId);
    if (!dragged || dragged.stationId === stationId) return;

    setError(null);
    // Optimistic swap/move, mirroring assignJudgeToStation's own ordering.
    const occupant = judgeAtStation(stationId);
    setJudges((prev) =>
      prev.map((j) => {
        if (j.id === judgeRowId) return { ...j, stationId };
        if (occupant && j.id === occupant.id) return { ...j, stationId: dragged.stationId };
        return j;
      })
    );
    startTransition(async () => {
      const result = await assignJudgeToStation(judgeRowId, stationId, slug);
      if (result.status === "error") setError(result.message ?? "Something went wrong.");
    });
  }

  function handleUnassignJudge(judgeRowId: string) {
    setError(null);
    setJudges((prev) => prev.map((j) => (j.id === judgeRowId ? { ...j, stationId: null } : j)));
    startTransition(async () => {
      const result = await unassignJudgeFromStation(judgeRowId, slug);
      if (result.status === "error") setError(result.message ?? "Something went wrong.");
    });
  }

  return (
    <div>
      <section className="mb-8 border border-outline-variant/25 bg-surface-container-low p-4">
        <h3 className="label-mono mb-3 flex items-center gap-2 text-primary">
          <Gavel className="h-3.5 w-3.5" aria-hidden="true" /> Judges
        </h3>

        <AddJudgeCombobox
          options={availableJudges.map((j) => ({ id: j.id, displayName: j.displayName, username: j.username }))}
          onInvite={handleInviteJudge}
          disabled={pending}
        />

        {judges.length === 0 ? (
          <p className="mt-4 text-sm text-on-surface/40">No judges added yet — invited judges must confirm before they can be assigned a station.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {judges.map((j) => {
              const station = j.stationId ? stations.find((s) => s.id === j.stationId) : null;
              const draggable = j.status === "approved";
              return (
                <li
                  key={j.id}
                  draggable={draggable}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(JUDGE_DRAG_TYPE, j.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={cn(
                    "flex items-center gap-3 border border-outline-variant/20 bg-surface-container-lowest px-3 py-2",
                    draggable && "cursor-grab active:cursor-grabbing"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{initials(j.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{j.name}</p>
                    {station ? <p className="label-mono text-[10px] text-on-surface/40">At {station.name}</p> : null}
                  </div>
                  <JudgeAssignmentStatusBadge status={j.status} />
                  <Button variant="ghost" size="icon" aria-label={`Remove ${j.name}`} disabled={pending} onClick={() => handleRemoveJudge(j.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mb-6 flex flex-wrap items-end gap-3 border border-outline-variant/25 bg-surface-container-low p-4">
        <div className="min-w-[200px] flex-1 space-y-2">
          <label className="text-sm font-bold text-on-surface" htmlFor="station-name">
            Station Name
          </label>
          <Input
            id="station-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Table 1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button size="sm" className="gap-1.5" tooltip="Add a new station" disabled={!name.trim() || pending} onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" /> Add Station
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {stations.length === 0 ? (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No stations set up yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => {
            const assignedJudge = judgeAtStation(station.id);
            return (
              <div
                key={station.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStationId(station.id);
                }}
                onDragLeave={() => setDragOverStationId((id) => (id === station.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnStation(station.id, e.dataTransfer.getData(JUDGE_DRAG_TYPE));
                }}
                className={cn(
                  "border border-outline-variant/25 bg-surface-container-low p-4 transition-colors",
                  dragOverStationId === station.id && "border-primary/70 bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <Radio className="h-4 w-4 text-primary" aria-hidden="true" /> {station.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge variant={STATUS_VARIANTS[station.status]}>{STATUS_LABELS[station.status]}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${station.name}`}
                      disabled={pending}
                      onClick={() => handleRemoveStation(station.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-on-surface/50">{matchLabel(station.currentMatchId)}</p>

                {assignedJudge ? (
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(JUDGE_DRAG_TYPE, assignedJudge.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="mt-3 flex cursor-grab items-center gap-2 border border-outline-variant/25 bg-surface-container-lowest px-2.5 py-1.5 active:cursor-grabbing"
                  >
                    <Gavel className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-xs text-on-surface">{assignedJudge.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${assignedJudge.name} from ${station.name}`}
                      className="shrink-0 text-on-surface/40 hover:text-on-surface"
                      onClick={() => handleUnassignJudge(assignedJudge.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 border border-dashed border-outline-variant/30 px-2.5 py-1.5 text-center text-[11px] text-on-surface/30">
                    Drag a judge here
                  </p>
                )}

                <div className="mt-3">
                  <Combobox
                    label="Match"
                    value={station.currentMatchId ?? NO_MATCH}
                    onValueChange={(v) => handleAssign(station.id, v)}
                    options={[{ value: NO_MATCH, label: "No match assigned" }, ...matchOptions]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
