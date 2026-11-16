/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Swords } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HeroContent } from "@/lib/site-content/schema";
import { cn } from "@/lib/utils";

// Theme defaults the preview falls back to when a color isn't set (same as
// `.legacy-hero` in globals.css).
const PREVIEW_DEFAULTS = {
  dark: { background: "#08080a", text: "#e2e2e2" },
  light: { background: "#fff8f7", text: "#201a19" },
};

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);

// The homepage hero, from /backend/content (Hero). Presentational only, so
// the backend editor can render a live preview with the same markup.
// `preview` pins it to one theme's colors regardless of the page's theme.
export function HeroView({
  hero,
  stats,
  preview,
}: {
  hero: HeroContent;
  stats?: ReactNode;
  preview?: "dark" | "light";
}) {
  const style: Record<string, string> = {};
  if (preview) {
    const colors = hero[preview];
    style.backgroundColor = colors.background || PREVIEW_DEFAULTS[preview].background;
    style.color = colors.text || PREVIEW_DEFAULTS[preview].text;
  } else {
    if (hero.dark.background) style["--hero-bg-dark"] = hero.dark.background;
    if (hero.dark.text) style["--hero-fg-dark"] = hero.dark.text;
    if (hero.light.background) style["--hero-bg-light"] = hero.light.background;
    if (hero.light.text) style["--hero-fg-light"] = hero.light.text;
  }

  const Title = preview ? "p" : "h1";

  return (
    <section
      className={cn(
        "legacy-hero hero-grid relative overflow-hidden border-b border-outline-variant/25",
        !preview && "hero-custom-colors",
        preview && "rounded-md border"
      )}
      style={style as CSSProperties}
    >
      <div
        className={cn(
          "mx-auto grid max-w-[1280px] gap-8 px-4 py-12 md:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16",
          preview && "gap-6 py-8 lg:py-10"
        )}
      >
        <div className={preview ? undefined : "animate-hero-fade-up"}>
          {hero.tag ? <p className="label-mono text-primary">{hero.tag}</p> : null}
          <Title className={cn("heading mt-3 leading-[1.02]", preview ? "text-3xl" : "text-4xl sm:text-5xl lg:text-[56px]")}>
            {hero.title}
            {hero.title && hero.titleRed ? <br /> : null}
            {hero.titleRed ? <span className="text-primary">{hero.titleRed}</span> : null}
          </Title>
          {hero.content ? (
            <p className="mt-4 max-w-lg whitespace-pre-line text-[15px] leading-relaxed opacity-70">{hero.content}</p>
          ) : null}
          {(hero.primaryLabel && hero.primaryHref) || (hero.secondaryLabel && hero.secondaryHref) ? (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {hero.primaryLabel && hero.primaryHref ? (
                <Button asChild size="lg">
                  <Link href={hero.primaryHref} target={isExternal(hero.primaryHref) ? "_blank" : undefined}>
                    {hero.primaryLabel} <ArrowRight />
                  </Link>
                </Button>
              ) : null}
              {hero.secondaryLabel && hero.secondaryHref ? (
                <Button asChild variant="outline" size="lg">
                  <Link href={hero.secondaryHref} target={isExternal(hero.secondaryHref) ? "_blank" : undefined}>
                    {hero.secondaryLabel}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          {stats}
        </div>

        <div
          className={cn(
            "hero-glass relative flex aspect-[4/3] items-center justify-center overflow-hidden lg:aspect-auto",
            preview ? "lg:h-[240px]" : "animate-hero-fade-in lg:h-[360px]"
          )}
        >
          {hero.imageUrl ? (
            <img src={hero.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(237,13,17,0.18), transparent 65%)" }}
                aria-hidden="true"
              />
              <Swords className="h-24 w-24 text-primary/70 lg:h-32 lg:w-32" aria-hidden="true" />
              <span className="sr-only">Beyblade X tournament battle artwork</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
