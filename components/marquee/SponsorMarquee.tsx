import { Marquee } from "@/components/marquee/Marquee";

const SPONSORS = [
  "TAKARA TOMY",
  "BEY ARENA PH",
  "SPIN CITY",
  "BLADE FORGE",
  "METRO BEY LEAGUE",
  "RIGHT SPIN CO.",
];

export function SponsorMarquee() {
  return (
    <section className="border-y border-outline-variant/20 bg-surface-container-lowest py-10">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        <p className="label-mono mb-6 text-center text-on-surface/40">Our Sponsors</p>
        <Marquee>
          {SPONSORS.map((name) => (
            <span
              key={name}
              className="heading shrink-0 text-2xl text-on-surface/20 transition-colors hover:text-primary"
            >
              {name}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
