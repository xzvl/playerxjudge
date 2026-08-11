"use client";

import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import { formatDate } from "@/lib/format";
import { MOCK_TOURNAMENTS, type MockTournament } from "@/lib/mock/tournaments";
import { MOCK_REGISTRATIONS, type MockRegistration } from "@/lib/mock/player-dashboard";

interface RegisteredEntry {
  registration: MockRegistration;
  tournament: MockTournament;
}

export function RegisteredTournamentsPanel() {
  const [view, setView] = useState<"current" | "past">("current");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const registered = useMemo(() => {
    const entries: RegisteredEntry[] = [];
    for (const registration of MOCK_REGISTRATIONS) {
      const tournament = MOCK_TOURNAMENTS.find((t) => t.id === registration.tournamentId);
      if (tournament) entries.push({ registration, tournament });
    }
    return entries;
  }, []);

  const filtered = registered.filter((r) => (view === "current" ? r.tournament.isUpcoming : !r.tournament.isUpcoming));
  const selectedTournament = MOCK_TOURNAMENTS.find((t) => t.id === selectedId) ?? null;

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
          {filtered.map(({ registration, tournament }) => (
            <div key={tournament.id} className="flex flex-col gap-2">
              <TournamentCard tournament={tournament} onOpenDetails={setSelectedId} />
              <p className="label-mono px-1 text-on-surface/40">
                Registered {formatDate(registration.registeredAt)}
              </p>
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
