import { Hero } from "@/components/home/Hero";
import { QuickAccess } from "@/components/home/QuickAccess";
import { TournamentListings } from "@/components/tournaments/TournamentListings";
import { PaymentMethodsMarquee } from "@/components/marquee/PaymentMethodsMarquee";
import { FindTournamentSection } from "@/components/tournaments/FindTournamentSection";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playerxjudge.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PlayerXJudge",
  url: siteUrl,
  description:
    "Beyblade X community tournament management platform for players, judges, and organizers.",
  sameAs: [
    "https://facebook.com/playerxjudge",
    "https://instagram.com/playerxjudge",
    "https://youtube.com/@playerxjudge",
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <QuickAccess />
      <TournamentListings />
      <PaymentMethodsMarquee />
      <FindTournamentSection />
    </>
  );
}
