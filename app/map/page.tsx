import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FindTournamentSection } from "@/components/tournaments/FindTournamentSection";

export const metadata: Metadata = {
  title: "Tournament Map",
  description: "Explore every upcoming Beyblade X tournament on an interactive map.",
};

export default async function MapPage({ searchParams }: { searchParams: Promise<{ tournament?: string }> }) {
  // Back-compat for the old ?tournament= query param (see the tournament
  // detail page's "View on Map" link) — that single-tournament view now
  // lives at its own /map/[slug] route instead.
  const { tournament } = await searchParams;
  if (tournament) redirect(`/map/${tournament}`);

  // Same map + "Use My Location"/range interactivity /tournaments already
  // has (FindTournamentSectionClient) rather than a separate map built for
  // this page — fullPage just drops its redundant "Open Full Map" button
  // and gives the map more vertical room.
  return <FindTournamentSection fullPage />;
}
