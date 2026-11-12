import Link from "next/link";
import { ArrowRight, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCounter } from "@/components/home/StatCounter";
import { getPublicTournamentCount } from "@/lib/tournaments/public-listings";
import { getPlatformStats } from "@/lib/platform-stats";

// The homepage hero keeps the site's original look (red grid backdrop,
// glass artwork panel with the red glow, uppercase headline, warm palette;
// see `.legacy-hero` in app/globals.css) but with the site-wide Geist type,
// compact spacing, and the standard buttons.
export async function Hero() {
  const [tournamentCount, platformStats] = await Promise.all([getPublicTournamentCount(), getPlatformStats()]);

  return (
    <section className="legacy-hero hero-grid relative overflow-hidden border-b border-outline-variant/25">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-12 md:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
        <div className="animate-hero-fade-up">
          <p className="label-mono text-primary">Beyblade X Community Platform</p>
          <h1 className="heading mt-3 text-4xl leading-[1.02] sm:text-5xl lg:text-[56px]">
            Beyblade X
            <br />
            <span className="text-primary">Community</span> Tournament
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-on-surface/60">
            Discover, register, and compete in Beyblade X tournaments near you. Track brackets,
            rankings, and communities — all in one platform built for players, judges, and
            organizers.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" tooltip="See all tournaments">
              <Link href="/tournaments">
                Browse tournaments <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" tooltip="Apply to run tournaments as an organizer">
              <Link href="/become/organizer">Register community</Link>
            </Button>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatCounter label="Players" value={platformStats.players} />
            <StatCounter label="Judges" value={platformStats.judges} />
            <StatCounter label="Tournaments" value={tournamentCount} />
            <StatCounter label="Communities" value={platformStats.communities} />
          </dl>
        </div>

        <div className="hero-glass relative flex aspect-[4/3] items-center justify-center animate-hero-fade-in lg:aspect-auto lg:h-[360px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(237,13,17,0.18), transparent 65%)",
            }}
            aria-hidden="true"
          />
          <Swords className="h-24 w-24 text-primary/70 lg:h-32 lg:w-32" aria-hidden="true" />
          <span className="sr-only">Beyblade X tournament battle artwork</span>
        </div>
      </div>
    </section>
  );
}
