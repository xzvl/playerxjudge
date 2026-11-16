/* eslint-disable @next/next/no-img-element */
import type React from "react";

import { cn } from "@/lib/utils";

// An image with a dark-theme and a light-theme source (e.g. a sponsor's
// dark-mode logo and its light-mode alternative). Both render; CSS in
// globals.css (`.theme-dark-only` / `.theme-light-only`) hides the one
// that doesn't match the current theme, so there's no flash on load and
// it works in server components. With only one source, it's used for both.
export function ThemedImage({
  darkSrc,
  lightSrc,
  alt,
  className,
  style,
}: {
  darkSrc: string | null | undefined;
  lightSrc: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dark = darkSrc || lightSrc;
  const light = lightSrc || darkSrc;
  if (!dark || !light) return null;
  if (dark === light) return <img src={dark} alt={alt} className={className} style={style} />;

  return (
    <>
      <img src={dark} alt={alt} className={cn("theme-dark-only", className)} style={style} />
      <img src={light} alt={alt} className={cn("theme-light-only", className)} style={style} />
    </>
  );
}
