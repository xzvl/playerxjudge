import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Match } from "@/lib/types/database";

// Subscribes to postgres_changes on `matches`, scoped to one tournament, and
// folds every insert/update/delete straight into the caller's own `matches`
// state — every standings table and bracket here already re-derives itself
// from that array on render (computeGroupStandings, applyRealMatches /
// advanceWinners, computeFinalStandings), so keeping the array itself live
// is the only thing this needs to do; nothing downstream needs its own
// subscription. See 20250101000049_matches_realtime.sql for the publication
// grant this depends on — RLS ("matches_select_all") already allows the read
// for every caller, including the player view's unauthenticated visitors.
export function useRealtimeMatches(
  tournamentId: string,
  setMatches: Dispatch<SetStateAction<Match[]>>,
  // Some callers hold a narrower slice of the tournament's matches than
  // "every row" — FinalStageBracketWorkspace's own state is only the
  // final-stage matches (group_id is null), for instance. The subscription
  // itself can only filter on one column (tournament_id), so a row outside
  // that slice would otherwise get merged in as if it belonged. Defaults to
  // accepting everything, for callers (GroupStageWorkspace, the player
  // view) that already hold the tournament's full match set.
  accept: (match: Match) => boolean = () => true
) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`matches-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;
            if (!deletedId) return;
            setMatches((prev) => prev.filter((m) => m.id !== deletedId));
            return;
          }
          const incoming = payload.new as Match;
          if (!accept(incoming)) return;
          setMatches((prev) => (prev.some((m) => m.id === incoming.id) ? prev.map((m) => (m.id === incoming.id ? incoming : m)) : [...prev, incoming]));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, setMatches]);
}
