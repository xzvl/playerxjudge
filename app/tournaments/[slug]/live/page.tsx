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
  return { title: tournament ? `Live — ${tournament.title}` : "Live" };
}

export default async function TournamentLivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = MOCK_TOURNAMENTS.find((t) => t.slug === slug);
  if (!tournament) notFound();

  return (
    <PagePlaceholder
      eyebrow="Live"
      title={`${tournament.title} — Live Results`}
      description="Live brackets, scoring, and announcements are coming in the next build phase."
      Icon={Radio}
    />
  );
}
