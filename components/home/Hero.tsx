import Link from "next/link";
import { Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCounter } from "@/components/home/StatCounter";
import { getPublicTournamentCount } from "@/lib/tournaments/public-listings";
import { getPlatformStats } from "@/lib/platform-stats";

export async function Hero() {
  const [tournamentCount, platformStats] = await Promise.all([getPublicTournamentCount(), getPlatformStats()]);

  return (
    <section className="cyber-grid relative overflow-hidden border-b border-outline-variant/25">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-20 md:px-16 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="animate-fade-up">
          <p className="label-mono text-primary">Beyblade X Community Platform</p>
          <h1 className="heading mt-4 text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
            Beyblade X
            <br />
            <span className="text-primary">Community</span> Tournament
          </h1>
          <p className="mt-6 max-w-lg text-base text-on-surface/60">
            Discover, register, and compete in Beyblade X tournaments near you. Track brackets,
            rankings, and communities — all in one platform built for players, judges, and
            organizers.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full sm:w-auto" tooltip="See all tournaments">
              <Link href="/tournaments">Browse Tournaments</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              tooltip="Apply to run tournaments as an organizer"
            >
              <Link href="/become/organizer">Register Community</Link>
            </Button>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <StatCounter label="Players" value={platformStats.players} />
            <StatCounter label="Judges" value={platformStats.judges} />
            <StatCounter label="Tournaments" value={tournamentCount} />
            <StatCounter label="Communities" value={platformStats.communities} />
          </dl>
        </div>

        <div className="glass-panel relative flex aspect-square items-center justify-center animate-fade-in lg:aspect-auto lg:h-[520px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(237,13,17,0.18), transparent 65%)",
            }}
            aria-hidden="true"
          />
          <Swords className="h-32 w-32 text-primary/70 lg:h-48 lg:w-48" aria-hidden="true" />
          <span className="sr-only">Beyblade X tournament battle artwork</span>
        </div>
      </div>
    </section>
  );
}
