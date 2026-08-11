"use client";

import { useState, useTransition } from "react";
import { Plus, Radio, X } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { addStation, assignStationMatch, removeStation } from "@/app/account/organizer/tournament/[slug]/workspace-panels-actions";
import type { TournamentStationStatus } from "@/lib/types/database";

export interface StationItem {
  id: string;
  name: string;
  status: TournamentStationStatus;
  currentMatchId: string | null;
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

export function TournamentStationsPanel({
  tournamentId,
  slug,
  stations: initialStations,
  matchOptions,
}: {
  tournamentId: string;
  slug: string;
  stations: StationItem[];
  matchOptions: ComboboxOption[];
}) {
  const [stations, setStations] = useState<StationItem[]>(initialStations);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const matchLabel = (id: string | null) => (id ? matchOptions.find((m) => m.value === id)?.label ?? "Unknown match" : "No match assigned");

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

  function handleRemove(stationId: string) {
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3 border border-outline-variant/25 bg-surface-container-low p-4">
        <div className="min-w-[200px] flex-1 space-y-2">
          <label className="text-sm font-medium text-on-surface" htmlFor="station-name">
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
          {stations.map((station) => (
            <div key={station.id} className="border border-outline-variant/25 bg-surface-container-low p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <Radio className="h-4 w-4 text-primary" aria-hidden="true" /> {station.name}
                </p>
                <div className="flex items-center gap-1">
                  <Badge variant={STATUS_VARIANTS[station.status]}>{STATUS_LABELS[station.status]}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${station.name}`}
                    disabled={pending}
                    onClick={() => handleRemove(station.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xs text-on-surface/50">{matchLabel(station.currentMatchId)}</p>
              <div className="mt-3">
                <Combobox
                  label="Match"
                  value={station.currentMatchId ?? NO_MATCH}
                  onValueChange={(v) => handleAssign(station.id, v)}
                  options={[{ value: NO_MATCH, label: "No match assigned" }, ...matchOptions]}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
