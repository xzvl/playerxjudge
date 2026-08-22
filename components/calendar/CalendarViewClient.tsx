"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import { BattleTypeBadge, TournamentTypeBadge } from "@/components/tournaments/badges";
import { dateKeyManila, formatDate, formatTime } from "@/lib/format";
import type { MockTournament } from "@/lib/mock/tournaments";

const ALL = "all";
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function initialYearMonth() {
  const todayKey = dateKeyManila(new Date().toISOString());
  const [year, month] = todayKey.split("-").map(Number);
  return { year, month: month - 1 };
}

export function CalendarViewClient({ tournaments }: { tournaments: MockTournament[] }) {
  const [{ year, month }, setCursor] = useState(initialYearMonth);
  const [province, setProvince] = useState(ALL);
  const [community, setCommunity] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derived from the real tournament list (same approach as
  // TournamentListingsClient), not a static province/community catalog —
  // only options that actually have a tournament show up.
  const provinces = useMemo(
    () => [...new Set(tournaments.map((t) => t.province).filter(Boolean))].sort(),
    [tournaments]
  );
  const availableCommunities = useMemo(
    () =>
      [
        ...new Set(
          tournaments
            .filter((t) => province === ALL || t.province === province)
            .map((t) => t.communityName)
            .filter((c): c is string => !!c)
        ),
      ].sort(),
    [tournaments, province]
  );

  function handleProvinceChange(next: string) {
    setProvince(next);
    setCommunity(ALL);
  }

  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }

  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      if (province !== ALL && t.province !== province) return false;
      if (community !== ALL && t.communityName !== community) return false;
      return true;
    });
  }, [tournaments, province, community]);

  const tournamentsByDate = useMemo(() => {
    const map = new Map<string, MockTournament[]>();
    for (const t of filtered) {
      const key = dateKeyManila(t.startsAt);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const todayKey = dateKeyManila(new Date().toISOString());

  const upcoming = useMemo(
    () =>
      filtered
        .filter((t) => t.isUpcoming)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [filtered]
  );

  const selectedTournament = tournaments.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-16">
      <div className="mb-8">
        <p className="label-mono text-primary">Plan Ahead</p>
        <h1 className="heading mt-2 text-3xl md:text-4xl">Tournament Calendar</h1>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="heading w-48 text-center text-xl">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="icon" aria-label="Next month" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[600px]">
          <Combobox
            label="Province"
            value={province}
            onValueChange={handleProvinceChange}
            options={[{ value: ALL, label: "All Provinces" }, ...provinces.map((p) => ({ value: p, label: p }))]}
          />
          <Combobox
            label="Community"
            value={community}
            onValueChange={setCommunity}
            options={[
              { value: ALL, label: "All Communities" },
              ...availableCommunities.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <MonthGrid
            year={year}
            month={month}
            tournamentsByDate={tournamentsByDate}
            todayKey={todayKey}
            onSelectTournament={setSelectedId}
          />
        </div>

        <div className="lg:col-span-1">
          <h2 className="label-mono mb-4 text-on-surface/40">Upcoming Tournaments</h2>
          {upcoming.length === 0 ? (
            <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-sm text-on-surface/50">
              No upcoming tournaments match your filters.
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="block w-full border border-outline-variant/25 bg-surface-container-low p-4 text-left transition-colors hover:border-primary/40"
                >
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <BattleTypeBadge type={t.battleType} />
                    <TournamentTypeBadge type={t.tournamentType} />
                  </div>
                  <p className="line-clamp-2 text-sm font-bold text-on-surface">{t.title}</p>
                  <p className="mt-2 text-xs text-on-surface/50">
                    {formatDate(t.startsAt)} &middot; {formatTime(t.startsAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TournamentDetailsModal
        tournament={selectedTournament}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
