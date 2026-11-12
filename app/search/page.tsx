"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { TournamentCard } from "@/components/tournaments/TournamentCard";
import { TournamentDetailsModal } from "@/components/tournaments/TournamentDetailsModal";
import { MOCK_TOURNAMENTS } from "@/lib/mock/tournaments";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return MOCK_TOURNAMENTS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q) ||
        t.province.toLowerCase().includes(q) ||
        t.communityName?.toLowerCase().includes(q)
    );
  }, [query]);

  const selectedTournament = MOCK_TOURNAMENTS.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
          <Search className="h-4 w-4 text-on-surface/60" aria-hidden="true" />
        </span>
        <div>
          <p className="label-mono text-on-surface/50">Search results</p>
          <h1 className="heading text-2xl">{query ? `"${query}"` : "Search PlayerXJudge"}</h1>
        </div>
      </div>

      {query && results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface/50">
          No tournaments found for &quot;{query}&quot;. Try a different keyword.
        </p>
      ) : null}

      {!query ? (
        <p className="text-sm text-on-surface/50">
          Search for tournaments, communities, players, and judges using the search bar above.
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((t) => (
            <TournamentCard key={t.id} tournament={t} onOpenDetails={setSelectedId} />
          ))}
        </div>
      ) : null}

      <TournamentDetailsModal
        tournament={selectedTournament}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
