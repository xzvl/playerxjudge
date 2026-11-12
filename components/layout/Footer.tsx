"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Facebook, Handshake, Instagram, Trophy, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SponsorMarquee } from "@/components/marquee/SponsorMarquee";
import { isAccountRoute, isBackendRoute, isTournamentConsoleRoute } from "@/lib/routes";
import type { MarqueeSponsor } from "@/lib/sponsors/queries";

const HOW_TO_STEPS = [
  { title: "Register", description: "Create your organizer account." },
  { title: "Create tournament", description: "Add details, rules, location, prizes and schedule." },
  { title: "Publish", description: "Open registrations and run everything from your dashboard." },
];

const FOOTER_COLUMNS = [
  {
    title: "Navigation",
    links: [
      { label: "Tournaments", href: "/tournaments" },
      { label: "Communities", href: "/communities" },
      { label: "Calendar", href: "/calendar" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Sponsors", href: "/sponsors" },
      { label: "FAQs", href: "/faqs" },
      { label: "How to use", href: "/how-to-use" },
      { label: "Rules", href: "/rules" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
];

export function Footer({ sponsors }: { sponsors: MarqueeSponsor[] }) {
  const pathname = usePathname();
  // Every /account and /backend page, plus the player view and judge
  // console, is its own app shell with no room for the site footer.
  if (isAccountRoute(pathname) || isBackendRoute(pathname) || isTournamentConsoleRoute(pathname)) return null;

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
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <BrandLogo width={136} height={15} />
              <p className="mt-3 max-w-xs text-[13px] text-on-surface/55">
                The community tournament platform for Beyblade X players, judges, and organizers.
              </p>
              <div className="mt-4 flex gap-1">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface/55 transition-colors hover:bg-surface-container hover:text-on-surface"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="text-xs font-medium text-on-surface/45">{column.title}</p>
                <ul className="mt-3 space-y-2">
                  {column.links.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="text-[13px] text-on-surface/70 transition-colors hover:text-on-surface">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-outline-variant/20 pt-5 text-xs text-on-surface/45">
            © {new Date().getFullYear()} PlayerXJudge. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
