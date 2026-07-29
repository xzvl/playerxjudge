import type { Metadata } from "next";
import { Trophy } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Global, province, community, player, judge, and organizer rankings.",
};

export default function LeaderboardPage() {
  return (
    <PagePlaceholder
      eyebrow="Rankings"
      title="Leaderboard"
      description="Global and season rankings across players, judges, communities, and organizers are coming in the next build phase."
      Icon={Trophy}
    />
  );
}
