import Link from "next/link";
import { ArrowRight, Layers, ShieldCheck, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";

const SLOTS = [
  { n: "01", label: "Combo 1" },
  { n: "02", label: "Combo 2" },
  { n: "03", label: "Combo 3" },
];

const POINTS = [
  { Icon: Layers, text: "Mix Blade, Ratchet and Bit into three combos" },
  { Icon: ShieldCheck, text: "Keep a legal deck ready for every tournament" },
  { Icon: Swords, text: "Track how each combo performs in your matches" },
];

// Esports-style call-out that sends players to the deck builder.
export function DeckBuilderSection() {
  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-8 md:px-6 md:py-10" aria-labelledby="deck-builder-heading">
      <div className="chamfer relative grid gap-8 overflow-hidden border border-outline-variant/30 bg-surface-container-low p-6 md:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary shadow-[0_0_14px_rgb(var(--m3-primary))]" />

        <div className="relative">
          <p className="label-mono flex items-center gap-2 text-primary">
            <span aria-hidden="true" className="h-3 w-[3px] -skew-x-12 bg-primary" />
            Deck Builder
          </p>
          <h2 id="deck-builder-heading" className="heading mt-2 text-3xl md:text-5xl">
            Build your own deck
          </h2>
          <p className="mt-3 max-w-lg text-base text-on-surface/65">
            Assemble your three-combo lineup, save it to your account and bring it to the next tournament.
          </p>
          <ul className="mt-5 space-y-2.5">
            {POINTS.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-on-surface/75">
                <span className="chamfer-sm flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-7 w-full sm:w-auto">
            <Link href="/account/beyblade/deck">
              Build your deck <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="relative grid grid-cols-3 gap-3" aria-hidden="true">
          {SLOTS.map(({ n, label }) => (
            <div
              key={n}
              className="chamfer-sm flex aspect-[3/4] flex-col justify-between border border-outline-variant/30 bg-background/60 p-3"
            >
              <span className="font-display text-2xl font-bold text-primary/80 md:text-3xl">{n}</span>
              <div className="space-y-1.5">
                <span className="block h-1.5 w-full bg-primary/60" />
                <span className="block h-1.5 w-2/3 bg-on-surface/15" />
                <span className="block h-1.5 w-1/2 bg-on-surface/15" />
                <span className="label-mono block pt-1 text-on-surface/45">{label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
