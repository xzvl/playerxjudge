import { Marquee } from "@/components/marquee/Marquee";
import type { MarqueeSponsor } from "@/lib/sponsors/queries";

export function SponsorMarquee({ sponsors }: { sponsors: MarqueeSponsor[] }) {
  // Nothing approved-and-active yet — skip the section instead of showing
  // an empty marquee track.
  if (sponsors.length === 0) return null;

  // A handful of sponsors makes for a sparse, slow-looking loop (Marquee
  // itself only doubles up once, for the seamless wraparound) — tripling
  // the list first gives it enough logos to actually read as a marquee.
  const displaySponsors = sponsors.length <= 3 ? [...sponsors, ...sponsors, ...sponsors] : sponsors;

  return (
    <section className="border-y border-outline-variant/20 bg-surface-container-lowest py-10">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        <p className="label-mono mb-6 text-center text-on-surface/40">Our Sponsors</p>
        <Marquee>
          {displaySponsors.map((sponsor, index) => {
            // Sponsors don't fill in both — website_url is the primary
            // link, facebook_url is the fallback most small/local sponsors
            // actually have.
            const href = sponsor.website_url || sponsor.facebook_url || null;
            const logo = sponsor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sponsor.logo_url}
                alt={sponsor.company_name}
                className="h-12 w-auto max-w-[160px] shrink-0 object-contain grayscale opacity-40 transition-all hover:opacity-100 hover:grayscale-0"
              />
            ) : (
              <span className="heading shrink-0 text-2xl uppercase text-on-surface/20 transition-colors hover:text-primary">
                {sponsor.company_name}
              </span>
            );
            const key = `${sponsor.id}-${index}`;
            return href ? (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer">
                {logo}
              </a>
            ) : (
              <span key={key}>{logo}</span>
            );
          })}
        </Marquee>
      </div>
    </section>
  );
}
