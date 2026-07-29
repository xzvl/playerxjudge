import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "For Players",
  description: "Register for tournaments, track your match history, and build your player profile.",
};

export default function PlayerPage() {
  return (
    <PagePlaceholder
      eyebrow="Compete"
      title="For Players"
      description="Player profiles, match history, and achievements are coming in the next build phase."
      Icon={UserRound}
    />
  );
}
