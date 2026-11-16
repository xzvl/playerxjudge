"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Facebook,
  Globe,
  Handshake,
  Instagram,
  MessageCircle,
  Music2,
  Trophy,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SponsorMarquee } from "@/components/marquee/SponsorMarquee";
import { isAccountRoute, isBackendRoute, isTournamentConsoleRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { MarqueeSponsor } from "@/lib/sponsors/queries";
import { formatCopyright, type FooterContent, type NavLink, type SocialPlatform } from "@/lib/site-content/schema";

const HOW_TO_STEPS = [
  { title: "Register", description: "Create your organizer account." },
  { title: "Create tournament", description: "Add details, rules, location, prizes and schedule." },
  { title: "Publish", description: "Open registrations and run everything from your dashboard." },
];

// Social platforms that have a Lucide icon; the rest use a generic one.
const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  x: Twitter,
  discord: MessageCircle,
  website: Globe,
};

// Brand column plus one per link group (static classes so Tailwind sees them).
const GRID_COLUMNS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-[1.5fr_1fr]",
  3: "md:grid-cols-[1.5fr_1fr_1fr]",
  4: "md:grid-cols-[1.5fr_1fr_1fr_1fr]",
  5: "md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]",
  6: "md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]",
};

// Footer links grouped into columns by their `group`, in first-seen order.
function groupLinks(links: NavLink[]): { title: string; links: NavLink[] }[] {
  const columns: { title: string; links: NavLink[] }[] = [];
  for (const link of links) {
    const title = link.group?.trim() || "Links";
    let column = columns.find((c) => c.title === title);
    if (!column) {
      column = { title, links: [] };
      columns.push(column);
    }
    column.links.push(link);
  }
  return columns;
}

export function Footer({
  sponsors,
  content,
  email,
}: {
  sponsors: MarqueeSponsor[];
  // Managed in /backend/content (Footer).
  content: FooterContent;
  email: string;
}) {
  const pathname = usePathname();
  // Every /account and /backend page, plus the player view and judge
  // console, is its own app shell with no room for the site footer.
  if (isAccountRoute(pathname) || isBackendRoute(pathname) || isTournamentConsoleRoute(pathname)) return null;

  const columns = groupLinks(content.links);

  return (
    <footer className="border-t border-outline-variant/20 bg-surface-container-lowest">
      <div className="mx-auto grid max-w-[1280px] gap-4 px-4 py-10 md:px-6 lg:grid-cols-[1fr_1fr_1.1fr]">
        <div className="flex flex-col justify-between rounded-lg border border-outline-variant/25 bg-surface-container-low p-5">
          <div>
            <Trophy className="h-4 w-4 text-on-surface/50" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Become a tournament organizer</p>
            <p className="mt-1 text-[13px] text-on-surface/55">
              Run Beyblade X events, manage brackets, and grow your community with organizer tools built for competitive play.
            </p>
          </div>
          <Button asChild size="sm" className="mt-4 w-fit" tooltip="Apply to run tournaments as an organizer">
            <Link href="/become/organizer">
              Register community <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-outline-variant/25 bg-surface-container-low p-5">
          <div>
            <Handshake className="h-4 w-4 text-on-surface/50" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">Become a sponsor</p>
            <p className="mt-1 text-[13px] text-on-surface/55">
              Put your brand in front of the Beyblade X community with featured placement, event banners and tournament badges.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 w-fit" tooltip="Apply to sponsor the community">
            <Link href="/become/sponsor">Become a sponsor</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-outline-variant/25 p-5">
          <p className="text-sm font-semibold">How to create a tournament</p>
          <ol className="mt-3 space-y-3">
            {HOW_TO_STEPS.map(({ title, description }, index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-outline-variant/40 text-[11px] font-medium tabular-nums text-on-surface/60">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[13px] font-medium">{title}</p>
                  <p className="text-xs text-on-surface/55">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <SponsorMarquee sponsors={sponsors} />

      <div className="border-t border-outline-variant/20">
        <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
          <div className={cn("grid gap-8 sm:grid-cols-2", GRID_COLUMNS[Math.min(columns.length + 1, 6)])}>
            <div>
              <BrandLogo width={136} height={15} />
              {content.socials.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                  {content.socials.map(({ id, platform, url }) => {
                    const Icon = SOCIAL_ICONS[platform] ?? Globe;
                    const label = platform === "x" ? "X" : platform[0].toUpperCase() + platform.slice(1);
                    return (
                      <a
                        key={id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface/55 transition-colors hover:bg-surface-container hover:text-on-surface"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
              {content.note ? (
                <p className="mt-3 max-w-xs whitespace-pre-line text-[13px] text-on-surface/55">{content.note}</p>
              ) : null}
            </div>

            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-medium text-on-surface/45">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        target={item.target}
                        rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                        className="text-[13px] text-on-surface/70 transition-colors hover:text-on-surface"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-2 border-t border-outline-variant/20 pt-5 text-xs text-on-surface/45 sm:flex-row sm:items-center sm:justify-between">
            <p>{formatCopyright(content.copyright)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {content.tagline ? <p>{content.tagline}</p> : null}
              {email ? (
                <a href={`mailto:${email}`} className="transition-colors hover:text-on-surface">
                  {email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
