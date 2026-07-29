"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { TournamentTable } from "@/components/tournaments/TournamentTable";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import { MOCK_TOURNAMENTS, PROVINCES, COMMUNITIES } from "@/lib/mock/tournaments";

const ALL = "all";

export function TournamentListings() {
  const [view, setView] = useState<"upcoming" | "recent">("upcoming");
  const [province, setProvince] = useState(ALL);
  const [community, setCommunity] = useState(ALL);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return MOCK_TOURNAMENTS.filter((t) => {
      if (view === "upcoming" && !t.isUpcoming) return false;
      if (view === "recent" && t.isUpcoming) return false;
      if (province !== ALL && t.province !== province) return false;
      if (community !== ALL && t.communityName !== community) return false;
      if (search.trim() && !t.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [view, province, community, search]);

  const selectedTournament = MOCK_TOURNAMENTS.find((t) => t.id === selectedId) ?? null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 md:px-16" aria-labelledby="listings-heading">
      <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="label-mono text-primary">Tournaments</p>
          <h2 id="listings-heading" className="heading mt-2 text-3xl md:text-4xl">
            Find Your Next Battle
          </h2>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "upcoming" | "recent")}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger>
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Provinces</SelectItem>
            {PROVINCES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={community} onValueChange={setCommunity}>
          <SelectTrigger>
            <SelectValue placeholder="Community" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Communities</SelectItem>
            {COMMUNITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournaments..."
            className="pl-10"
            aria-label="Search tournaments"
          />
        </div>
      </div>

      {view === "upcoming" ? (
        filtered.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((t) => (
              <TournamentCard key={t.id} tournament={t} onOpenDetails={setSelectedId} />
            ))}
          </div>
        ) : (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            No upcoming tournaments match your filters.
          </p>
        )
      ) : (
        <TournamentTable tournaments={filtered} onOpenDetails={setSelectedId} />
      )}

      <TournamentDetailsModal
        tournament={selectedTournament}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </section>
  );
}
