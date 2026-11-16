import { HeroView } from "@/components/home/HeroView";
import { StatCounter } from "@/components/home/StatCounter";
import { getPublicTournamentCount } from "@/lib/tournaments/public-listings";
import { getPlatformStats } from "@/lib/platform-stats";
import { getSiteContent } from "@/lib/site-content/queries";

// The homepage hero keeps the site's original look (red grid backdrop,
// glass artwork panel with the red glow, uppercase headline, warm palette;
// see `.legacy-hero` in app/globals.css). Its text, buttons, image and
// colors come from /backend/content (Hero); see HeroView.
export async function Hero() {
  const [tournamentCount, platformStats, content] = await Promise.all([
    getPublicTournamentCount(),
    getPlatformStats(),
    getSiteContent(),
  ]);

  return (
    <HeroView
      hero={content.hero}
      stats={
        <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <StatCounter label="Players" value={platformStats.players} />
          <StatCounter label="Judges" value={platformStats.judges} />
          <StatCounter label="Tournaments" value={tournamentCount} />
          <StatCounter label="Communities" value={platformStats.communities} />
        </dl>
      }
    />
  );
}
