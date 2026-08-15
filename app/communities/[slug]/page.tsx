import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Facebook, Instagram, MapPin, MessageCircle, Users2, Youtube } from "lucide-react";

import { TournamentThumbnail } from "@/components/tournaments/TournamentThumbnail";
import { TournamentStatusBadge } from "@/components/dashboard/organizer/badges";
import { formatDate } from "@/lib/format";
import { getPublicCommunityBySlug, getPublicTournamentsHostedBy } from "@/lib/communities/public-profile";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const community = await getPublicCommunityBySlug(slug);
  return { title: community ? community.name : "Community" };
}

const SOCIAL_LINKS: { key: "facebook_url" | "instagram_url" | "youtube_url" | "messenger_url"; label: string; icon: typeof Facebook }[] = [
  { key: "facebook_url", label: "Facebook", icon: Facebook },
  { key: "instagram_url", label: "Instagram", icon: Instagram },
  { key: "youtube_url", label: "YouTube", icon: Youtube },
  { key: "messenger_url", label: "Messenger", icon: MessageCircle },
];

function thumbnailColorFor(id: string): string {
  const palette = ["#ed0d11", "#603e39", "#454747", "#ffb4ab"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export default async function CommunityProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const community = await getPublicCommunityBySlug(slug);
  if (!community) notFound();

  const tournaments = await getPublicTournamentsHostedBy(community.id);
  const locationLine = [community.headquarter_name, community.address_line, community.city, community.province]
    .filter(Boolean)
    .join(", ");
  const socialLinks = SOCIAL_LINKS.filter((s) => community[s.key]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="flex flex-col items-center gap-4 border-b border-outline-variant/25 pb-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-outline-variant/40 bg-surface-container-low text-primary">
          {community.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Users2 className="h-8 w-8" aria-hidden="true" />
          )}
        </div>
        <h1 className="heading text-3xl">{community.name}</h1>
        {locationLine ? (
          <p className="flex items-center gap-1.5 text-sm text-on-surface/60">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {locationLine}
          </p>
        ) : null}
        <p className="label-mono text-on-surface/40">{community.member_count} members</p>

        {socialLinks.length > 0 ? (
          <div className="mt-2 flex items-center gap-3">
            {socialLinks.map(({ key, label, icon: Icon }) => (
              <a
                key={key}
                href={community[key]!}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="flex h-9 w-9 items-center justify-center border border-outline-variant/40 text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="label-mono mb-4 flex items-center gap-2 text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> Tournaments Hosted
        </h2>
        {tournaments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.slug}`}
                className="group flex flex-col border border-outline-variant/25 bg-surface-container-low transition-colors hover:border-primary/40"
              >
                <TournamentThumbnail
                  color={thumbnailColorFor(t.id)}
                  title={t.title}
                  imageUrl={t.thumbnailUrl}
                  className="aspect-[16/9]"
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <TournamentStatusBadge status={t.status} />
                  <h3 className="heading text-base leading-tight group-hover:text-primary">{t.title}</h3>
                  <p className="text-xs text-on-surface/50">{formatDate(t.startsAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
            This community hasn&apos;t hosted any tournaments yet.
          </p>
        )}
      </section>
    </div>
  );
}
