"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import { formatDate } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

export interface RegisteredEntry {
  registeredAt: string;
  tournament: MockTournament;
}

export function RegisteredTournamentsPanel({ entries }: { entries: RegisteredEntry[] }) {
  const [view, setView] = useState<"current" | "past">("current");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = entries.filter((e) => (view === "current" ? e.tournament.isUpcoming : !e.tournament.isUpcoming));
  const selectedTournament = entries.find((e) => e.tournament.id === selectedId)?.tournament ?? null;

  return (
    <div>
      <Tabs value={view} onValueChange={(v) => setView(v as "current" | "past")} className="mb-6">
        <TabsList>
          <TabsTrigger value="current">Current &amp; Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ registeredAt, tournament }) => (
            <div key={tournament.id} className="flex flex-col gap-2">
              <TournamentCard tournament={tournament} onOpenDetails={setSelectedId} />
              <p className="label-mono px-1 text-on-surface/40">Registered {formatDate(registeredAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {view === "current" ? "You aren't registered for any upcoming tournaments." : "No past registrations yet."}
        </p>
      )}

      <TournamentDetailsModal
        tournament={selectedTournament}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
