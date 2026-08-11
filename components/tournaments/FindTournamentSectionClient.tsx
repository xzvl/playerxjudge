"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import type { MockTournament } from "@/lib/mock/tournaments";

const TournamentMap = dynamic(
  () => import("@/components/tournaments/TournamentMap").then((mod) => mod.TournamentMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-surface-container-low" aria-hidden="true" />
    ),
  },
);

export function FindTournamentSectionClient({ tournaments }: { tournaments: MockTournament[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTournament = tournaments.find((t) => t.id === selectedId) ?? null;

  return (
    <section
      className="mx-auto max-w-[1440px] px-4 py-16 md:px-16"
      aria-labelledby="find-tournament-heading"
    >
      <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="label-mono text-primary">Explore</p>
          <h2 id="find-tournament-heading" className="heading mt-2 text-3xl md:text-4xl">
            Find a Tournament Near You
          </h2>
          <p className="mt-3 max-w-xl text-sm text-on-surface/60">
            Every upcoming tournament is pinned on the map below. Hover a pin for its name, click
            it to open the full details.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" tooltip="Open the full tournament map">
          <Link href="/map">Open Full Map</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-on-surface/50">
        <div className="flex items-center gap-2">
          <svg width="14" height="19" viewBox="0 0 24 32" fill="none" aria-hidden="true">
            <path
              d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z"
              fill="#ed0d11"
              stroke="#131313"
              strokeWidth="1"
            />
            <circle cx="12" cy="12" r="4.5" fill="#131313" />
          </svg>
          Default pin
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-surface-container-low" />
          Community logo pin
        </div>
      </div>

      {tournaments.length > 0 ? (
        <div className="h-[480px] border border-outline-variant/25 bg-surface-container-lowest md:h-[560px]">
          <TournamentMap tournaments={tournaments} onSelect={setSelectedId} />
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          No upcoming tournaments have a pinned location yet.
        </p>
      )}

      <TournamentDetailsModal
        tournament={selectedTournament}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </section>
  );
}
