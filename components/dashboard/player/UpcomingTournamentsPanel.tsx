"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import type { MockTournament } from "@/lib/mock/tournaments";

export function UpcomingTournamentsPanel({
  tournaments,
  province,
}: {
  tournaments: MockTournament[];
  province: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { tournaments: shown, personalized } = useMemo(() => {
    const upcoming = tournaments
      .filter((t) => t.isUpcoming)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const nearby = province ? upcoming.filter((t) => t.province === province) : [];
    return nearby.length > 0
      ? { tournaments: nearby, personalized: true }
      : { tournaments: upcoming, personalized: false };
  }, [tournaments, province]);

  const selectedTournament = tournaments.find((t) => t.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm text-on-surface/60">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {personalized ? (
          <span>
            Showing tournaments near <span className="text-on-surface">{province}</span>.
          </span>
        ) : (
          <span>
            {province
              ? `No upcoming tournaments in ${province} yet — showing all provinces.`
              : "Set your province in account settings to personalize this list — showing all provinces."}
          </span>
        )}
      </div>

      {shown.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <TournamentCard key={t.id} tournament={t} onOpenDetails={setSelectedId} />
          ))}
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No upcoming tournaments right now.
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
