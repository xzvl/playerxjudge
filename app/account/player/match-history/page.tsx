import type { Metadata } from "next";

import { MatchHistoryPanel } from "@/components/dashboard/player/MatchHistoryPanel";

export const metadata: Metadata = { title: "Match History", robots: { index: false, follow: false } };

export default function MatchHistoryPage() {
  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Match History</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every match you&apos;ve played — won or lost.</p>
      <div className="mt-8">
        <MatchHistoryPanel />
      </div>
    </div>
  );
}
