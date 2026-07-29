import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { MOCK_TOURNAMENTS } from "@/lib/mock/tournaments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = MOCK_TOURNAMENTS.find((t) => t.slug === slug);
  return { title: tournament ? `Register — ${tournament.title}` : "Register" };
}

export default async function TournamentRegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = MOCK_TOURNAMENTS.find((t) => t.slug === slug);
  if (!tournament) notFound();

  return (
    <PagePlaceholder
      eyebrow="Registration"
      title={`Register for ${tournament.title}`}
      description="Player check-in and registration forms with payment integration are coming in the next build phase."
      Icon={ClipboardCheck}
    />
  );
}
