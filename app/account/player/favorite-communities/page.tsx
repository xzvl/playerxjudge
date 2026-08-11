import type { Metadata } from "next";

import { FavoriteCommunitiesPanel } from "@/components/dashboard/player/FavoriteCommunitiesPanel";

export const metadata: Metadata = { title: "Favorite Communities", robots: { index: false, follow: false } };

export default function FavoriteCommunitiesPage() {
  return (
    <div>
      <p className="label-mono text-primary">Player Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Favorite Communities</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Communities you belong to, current and past.</p>
      <div className="mt-8">
        <FavoriteCommunitiesPanel />
      </div>
    </div>
  );
}
