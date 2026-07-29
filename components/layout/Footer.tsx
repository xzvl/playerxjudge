import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaymentMethodsMarquee } from "@/components/marquee/PaymentMethodsMarquee";

const HOW_TO_STEPS = [
  {
    step: "01",
    title: "Register",
    description: "Create your organizer account.",
  },
  {
    step: "02",
    title: "Create Tournament",
    description: "Fill in tournament information, rules, location, prizes, and schedule.",
  },
  {
    step: "03",
    title: "Publish",
    description: "Publish your event, accept registrations, and manage everything from your dashboard.",
  },
];

const FOOTER_NAV = [
  { label: "Calendar", href: "/calendar" },
  { label: "Communities", href: "/communities" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Rules", href: "/rules" },
];

const FOOTER_MORE = [
  { label: "Sponsors", href: "/sponsors" },
  { label: "FAQs", href: "/faqs" },
];

const SOCIALS = [
  { label: "Facebook", href: "https://facebook.com", Icon: Facebook },
  { label: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { label: "YouTube", href: "https://youtube.com", Icon: Youtube },
];

export function Footer() {
  return (
    <footer className="border-t border-outline-variant/25 bg-surface-container-lowest">
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="glass-panel flex flex-col justify-between p-6">
              <div>
                <p className="heading text-xl">Become a Tournament Organizer</p>
                <p className="mt-3 text-sm text-on-surface/60">
                  Run your own Beyblade X events, manage brackets, and grow your community with
                  organizer tools built for competitive play.
                </p>
              </div>
              <Button asChild className="mt-6 w-fit">
                <Link href="/join-community">Register Community</Link>
              </Button>
            </div>
            <div className="glass-panel flex flex-col justify-between p-6">
              <div>
                <p className="heading text-xl">Become a Sponsor</p>
                <p className="mt-3 text-sm text-on-surface/60">
                  Get your brand in front of the Beyblade X community through featured placement,
                  event banners, and tournament badges.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-6 w-fit">
                <Link href="/sponsors/become">Become Sponsor</Link>
              </Button>
            </div>
          </div>

          <div>
            <p className="label-mono mb-6 text-primary">How To Create Tournament</p>
            <ol className="space-y-6">
              {HOW_TO_STEPS.map(({ step, title, description }) => (
                <li key={step} className="flex gap-4">
                  <span className="heading text-2xl text-on-surface/20">{step}</span>
                  <div>
                    <p className="font-inter font-bold text-on-surface">{title}</p>
                    <p className="mt-1 text-sm text-on-surface/60">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <PaymentMethodsMarquee />

      <div className="border-t border-outline-variant/25">
        <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-16">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <p className="heading text-lg">
                Player<span className="text-primary">X</span>Judge
              </p>
              <p className="mt-3 max-w-xs text-sm text-on-surface/60">
                The community tournament platform for Beyblade X players, judges, and organizers.
              </p>
              <div className="mt-6 flex gap-3">
                {SOCIALS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center border border-outline-variant/40 text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <p className="label-mono mb-4 text-on-surface/40">Navigation</p>
              <ul className="space-y-3">
                {FOOTER_NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-on-surface/70 hover:text-primary">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="label-mono mb-4 text-on-surface/40">More</p>
              <ul className="space-y-3">
                {FOOTER_MORE.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-on-surface/70 hover:text-primary">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <a
                    href="https://xzvlstore.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-on-surface/70 hover:text-primary"
                  >
                    XZVL Store
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="label-mono mb-4 text-on-surface/40">Legal</p>
              <ul className="space-y-3">
                <li>
                  <Link href="/terms" className="text-sm text-on-surface/70 hover:text-primary">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-on-surface/70 hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-outline-variant/20 pt-6 text-center text-xs text-on-surface/40">
            © {new Date().getFullYear()} PlayerXJudge. All Rights Reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
