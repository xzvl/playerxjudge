import type { Metadata } from "next";
import Link from "next/link";
import { Facebook, Globe, Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getActiveSponsors } from "@/lib/sponsors/queries";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Meet the brands sponsoring PlayerXJudge tournaments and communities.",
};

export default async function SponsorsPage() {
  const sponsors = await getActiveSponsors();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-primary">Partners</p>
          <h1 className="heading mt-2 text-3xl md:text-4xl">Sponsors</h1>
          <p className="mt-3 max-w-xl text-sm text-on-surface/60">
            The brands backing PlayerXJudge tournaments and communities.
          </p>
        </div>
        <Button asChild size="lg" tooltip="Apply to sponsor the community">
          <Link href="/become/sponsor">Become a Sponsor</Link>
        </Button>
      </div>

      {sponsors.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="flex flex-col border border-outline-variant/25 bg-surface-container-low">
              <div className="flex h-60 items-center justify-center border-b border-outline-variant/25 bg-surface-container-lowest p-6">
                {sponsor.logo_url ? (
                  // Fixed image height (not just a fixed container) — object-contain
                  // alone still lets a wide/short logo render much smaller than a
                  // squarish one even inside an equal-height box, which is what
                  // actually read as "different sizes" card to card. w-auto lets
                  // width scale naturally off that fixed height; max-w-full guards
                  // against an extreme-aspect-ratio logo overflowing the card.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sponsor.logo_url} alt={sponsor.company_name} className="h-40 w-auto max-w-full object-contain" />
                ) : (
                  <span className="heading text-2xl uppercase text-on-surface/20">{sponsor.company_name}</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <p className="heading text-lg text-on-surface">{sponsor.company_name}</p>
                <div className="mt-auto flex flex-col gap-1.5 pt-2 text-sm">
                  {sponsor.website_url ? (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-on-surface/70 hover:text-primary"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{sponsor.website_url}</span>
                    </a>
                  ) : null}
                  {sponsor.facebook_url ? (
                    <a
                      href={sponsor.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-on-surface/70 hover:text-primary"
                    >
                      <Facebook className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{sponsor.facebook_url}</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 border border-outline-variant/25 bg-surface-container-low p-16 text-center">
          <Handshake className="h-8 w-8 text-on-surface/30" aria-hidden="true" />
          <p className="text-sm text-on-surface/50">No sponsors yet — check back soon.</p>
        </div>
      )}
    </div>
  );
}
