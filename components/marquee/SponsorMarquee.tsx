import { Marquee } from "@/components/marquee/Marquee";
import type { MarqueeSponsor } from "@/lib/sponsors/queries";

export function SponsorMarquee({ sponsors }: { sponsors: MarqueeSponsor[] }) {
  // Nothing approved-and-active yet: skip the section entirely.
  if (sponsors.length === 0) return null;

  return (
    <section className="border-t border-outline-variant/20 py-8">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <p className="mb-5 text-center text-xs font-medium text-on-surface/45">Our sponsors</p>
        <Marquee>
          {sponsors.map((sponsor) => {
            // website_url is the primary link; facebook_url is the fallback
            // most small/local sponsors actually have.
            const href = sponsor.website_url || sponsor.facebook_url || null;
            const logo = sponsor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sponsor.logo_url}
                alt={sponsor.company_name}
                className="h-9 w-auto max-w-[140px] object-contain opacity-60 transition-opacity hover:opacity-100"
              />
            ) : (
              <span className="text-sm font-semibold text-on-surface/50 transition-colors hover:text-on-surface">
                {sponsor.company_name}
              </span>
            );
            return href ? (
              <a key={sponsor.id} href={href} target="_blank" rel="noopener noreferrer">
                {logo}
              </a>
            ) : (
              <span key={sponsor.id}>{logo}</span>
            );
          })}
        </Marquee>
      </div>
    </section>
  );
}
