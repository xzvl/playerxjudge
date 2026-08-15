import Link from "next/link";
import { Facebook, Instagram, MapPin, MessageCircle, Users2, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { PublicCommunityListing } from "@/lib/communities/public-profile";

// The first available social link, in this fallback order — replaces the
// organizer-facing card's "Members" button here, since a public visitor has
// nothing to manage.
const SOCIAL_LINKS: { key: "facebookUrl" | "instagramUrl" | "youtubeUrl" | "messengerUrl"; label: string; icon: typeof Facebook }[] = [
  { key: "facebookUrl", label: "Facebook", icon: Facebook },
  { key: "instagramUrl", label: "Instagram", icon: Instagram },
  { key: "youtubeUrl", label: "YouTube", icon: Youtube },
  { key: "messengerUrl", label: "Messenger", icon: MessageCircle },
];

function primarySocialLink(community: PublicCommunityListing) {
  return SOCIAL_LINKS.find((s) => community[s.key]) ?? null;
}

// Same card layout as the organizer's own CommunityManagementPanel, minus
// the owner-only bits (Edit/Delete, the Active/Inactive and Pending/Approved
// badges) — a public visitor doesn't manage these or need to see internal
// moderation state. The Members button becomes a link to whichever social
// page this community has set, if any.
export function CommunityListingsPanel({ communities }: { communities: PublicCommunityListing[] }) {
  if (communities.length === 0) {
    return (
      <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
        No approved communities yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => {
        const social = primarySocialLink(community);
        return (
          <div key={community.id} className="border border-outline-variant/25 bg-surface-container-low p-5">
            <div className="mb-3 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-outline-variant/40 text-primary">
              {community.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Users2 className="h-4 w-4" aria-hidden="true" />
              )}
            </div>

            <Link href={`/communities/${community.slug}`} className="heading block text-base leading-tight hover:text-primary">
              {community.name}
            </Link>
            <p className="mt-1 flex items-start gap-1.5 text-xs text-on-surface/50">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" /> {community.locationLine}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-on-surface/70">{community.memberCount} members</p>
              <p className="label-mono text-on-surface/40">Since {formatDate(community.sinceDate)}</p>
            </div>

            {social ? (
              <div className="mt-4">
                <Button asChild variant="outline" size="sm" className="w-full gap-1.5" tooltip={`Visit this community's ${social.label}`}>
                  <a href={community[social.key]!} target="_blank" rel="noreferrer">
                    <social.icon className="h-3.5 w-3.5" /> {social.label}
                  </a>
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
