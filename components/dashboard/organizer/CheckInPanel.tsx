"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RegistrationStatusBadge } from "@/components/dashboard/organizer/badges";
import {
  MOCK_ORGANIZED_TOURNAMENTS,
  MOCK_ORGANIZER_REGISTRATIONS,
  type MockRegistration,
} from "@/lib/mock/organizer-dashboard";

// Tournaments whose check-in window is currently relevant: registration has
// closed and the event is imminent or already underway.
const CHECK_IN_STATUSES = new Set(["registration_closed", "ongoing"]);

export function CheckInPanel() {
  const [registrations, setRegistrations] = useState<MockRegistration[]>(MOCK_ORGANIZER_REGISTRATIONS);

  const checkInTournaments = MOCK_ORGANIZED_TOURNAMENTS.filter((t) => CHECK_IN_STATUSES.has(t.status));

  function toggleCheckedIn(id: string) {
    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === id
          ? r.status === "checked_in"
            ? { ...r, status: "confirmed", checkedInAt: null }
            : { ...r, status: "checked_in", checkedInAt: new Date().toISOString() }
          : r
      )
    );
  }

  if (checkInTournaments.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        No tournaments are in their check-in window right now.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {checkInTournaments.map((tournament) => {
        const roster = registrations.filter(
          (r) => r.tournamentId === tournament.id && r.status !== "cancelled"
        );
        const checkedInCount = roster.filter((r) => r.status === "checked_in").length;

        return (
          <section key={tournament.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="heading text-lg">{tournament.title}</h2>
              <p className="label-mono text-on-surface/40">
                {checkedInCount}/{roster.length} checked in
              </p>
            </div>

            {roster.length > 0 ? (
              <ul className="divide-y divide-outline-variant/15 border border-outline-variant/25 bg-surface-container-low">
                {roster.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {r.playerName} {r.teamName ? <span className="text-on-surface/40">&middot; {r.teamName}</span> : null}
                      </p>
                      <div className="mt-1">
                        <RegistrationStatusBadge status={r.status} />
                      </div>
                    </div>
                    <Button
                      variant={r.status === "checked_in" ? "outline" : "default"}
                      size="sm"
                      className="shrink-0 gap-1.5"
                      tooltip={r.status === "checked_in" ? "Undo check-in" : "Mark this player checked in"}
                      onClick={() => toggleCheckedIn(r.id)}
                    >
                      {r.status === "checked_in" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Checked In
                        </>
                      ) : (
                        <>
                          <Circle className="h-3.5 w-3.5" /> Check In
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-center text-sm text-on-surface/50">
                No registrations for this tournament.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
