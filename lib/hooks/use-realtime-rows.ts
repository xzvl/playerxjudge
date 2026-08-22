import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import { createClient } from "@/lib/supabase/client";

// Generic counterpart to useRealtimeMatches — subscribes to postgres_changes
// on any tournament-scoped table keyed by `id`, merging every insert/update/
// delete straight into the caller's own array state, the same
// upsert-or-append-by-id/filter-out-on-delete shape. `matches` keeps its own
// bespoke hook (it needs the extra `accept` predicate some callers use to
// scope to a slice of a tournament's matches — see use-realtime-matches.ts)
// rather than being rebuilt on top of this one, to avoid touching that
// already-in-use hook; this is for the simpler cases (SpectatorBoard's
// tournament_stations/judges feeds) that just need the whole table's rows
// for one tournament kept live.
export function useRealtimeRows<T extends { id: string }>(
  table: string,
  tournamentId: string,
  setRows: Dispatch<SetStateAction<T[]>>
) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${table}-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;
            if (!deletedId) return;
            setRows((prev) => prev.filter((r) => r.id !== deletedId));
            return;
          }
          const incoming = payload.new as T;
          setRows((prev) => (prev.some((r) => r.id === incoming.id) ? prev.map((r) => (r.id === incoming.id ? incoming : r)) : [...prev, incoming]));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, tournamentId, setRows]);
}
