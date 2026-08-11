import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Radio } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { MOCK_TOURNAMENTS } from "@/lib/mock/tournaments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = MOCK_TOURNAMENTS.find((t) => t.slug === slug);
  return { title: tournament ? `Player — ${tournament.title}` : "Player" };
}

// "Go Shoot!" once a tournament has started — the player-facing live view
// (brackets, current match, station assignment). Same placeholder pattern
// as /live for now; that route stays in place but is no longer linked to.
export default async function TournamentPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = MOCK_TOURNAMENTS.find((t) => t.slug === slug);
  if (!tournament) notFound();

  return (
    <PagePlaceholder
      eyebrow="Player"
      title={`${tournament.title} — Player View`}
      description="Live brackets, your current match, and station assignment are coming in the next build phase."
      Icon={Radio}
    />
  );
}
