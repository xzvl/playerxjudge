"use client";

import { useState, type ReactNode } from "react";
import { ListOrdered, Swords, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type LeagueTab = "roster" | "standings" | "matches";

// Tabs whose selection lives in `?tab=` (so links like "?tab=matches" and
// a refresh land on the right one) without a server round-trip per switch.
export function LeagueTabs({
  initialTab,
  roster,
  standings,
  matches,
  counts,
}: {
  initialTab: LeagueTab;
  roster: ReactNode;
  standings: ReactNode;
  matches: ReactNode;
  counts: { roster: number; matches: number };
}) {
  const [tab, setTab] = useState<LeagueTab>(initialTab);

  const onChange = (value: string) => {
    const next = value as LeagueTab;
    setTab(next);
    // Read the live URL (not the router's snapshot) and write it back
    // without involving the Next router, so switching never waits on it.
    const params = new URLSearchParams(window.location.search);
    params.set("tab", next);
    if (next !== "matches") params.delete("player");
    try {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
    } catch {
      // URL sync is cosmetic; the tab has already switched.
    }
  };

  return (
    <Tabs value={tab} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="roster">
          <Users className="h-3.5 w-3.5" aria-hidden="true" /> Roster
          <span className="text-xs tabular-nums text-on-surface/45">{counts.roster}</span>
        </TabsTrigger>
        <TabsTrigger value="standings">
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> Standings
        </TabsTrigger>
        <TabsTrigger value="matches">
          <Swords className="h-3.5 w-3.5" aria-hidden="true" /> Matches
          <span className="text-xs tabular-nums text-on-surface/45">{counts.matches}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="roster">{roster}</TabsContent>
      <TabsContent value="standings">{standings}</TabsContent>
      <TabsContent value="matches">{matches}</TabsContent>
    </Tabs>
  );
}
