import type { Metadata } from "next";

import { AchievementsGrid } from "@/components/dashboard/player/AchievementsGrid";

export const metadata: Metadata = { title: "Achievements", robots: { index: false, follow: false } };

export default function AchievementsPage() {
  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Achievements</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Unlocked achievements glow in their color — keep battling to light up the rest.
      </p>
      <div className="mt-8">
        <AchievementsGrid />
      </div>
    </div>
  );
}
