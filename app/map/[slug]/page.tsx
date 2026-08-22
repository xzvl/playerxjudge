import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { TournamentLocationMapSection } from "@/components/tournaments/TournamentLocationMapSection";
import { getPublicTournamentBySlug } from "@/lib/tournaments/public-listings";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) return { title: "Tournament Not Found" };
  return { title: `Map — ${tournament.title}`, description: `Find ${tournament.locationName} and get directions.` };
}

export default async function TournamentMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();

  // Same "is there actually a pin" check the tournament detail page uses
  // (0,0 is Null Island, not a real venue — a tournament that never set a
  // location lands there by default).
  const hasPin = tournament.latitude !== 0 || tournament.longitude !== 0;
  const fullAddress = [tournament.addressLine, tournament.city, tournament.province]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  if (!hasPin) {
    return (
      <PagePlaceholder
        eyebrow={tournament.title}
        title="No Venue Location Set"
        description="This tournament's organizer hasn't pinned a venue location yet."
        Icon={MapPin}
      >
        <Link href={`/tournaments/${tournament.slug}`} className="label-mono text-primary hover:underline">
          Back to Tournament
        </Link>
      </PagePlaceholder>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-16">
      <Link
        href={`/tournaments/${tournament.slug}`}
        className="label-mono flex items-center gap-1.5 text-on-surface/50 hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tournament
      </Link>

      <div className="mt-3 flex items-start gap-2">
        <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h1 className="heading text-2xl">{tournament.locationName || tournament.title}</h1>
          <p className="mt-1 text-sm text-on-surface/60">{fullAddress || "Address not set"}</p>
        </div>
      </div>

      <div className="mt-6">
        <TournamentLocationMapSection lat={tournament.latitude} lng={tournament.longitude} title={tournament.title} />
      </div>
    </div>
  );
}
