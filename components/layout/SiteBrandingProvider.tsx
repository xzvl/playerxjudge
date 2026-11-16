"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_SITE_CONTENT, type BrandingContent } from "@/lib/site-content/schema";

const SiteBrandingContext = createContext<BrandingContent>(DEFAULT_SITE_CONTENT.branding);

// Branding from /backend/content (logos, contact email), provided once by
// the root layout so any component (BrandLogo, the sponsor form, ...) can
// read it without prop drilling.
export function SiteBrandingProvider({ branding, children }: { branding: BrandingContent; children: ReactNode }) {
  return <SiteBrandingContext.Provider value={branding}>{children}</SiteBrandingContext.Provider>;
}

export function useSiteBranding(): BrandingContent {
  return useContext(SiteBrandingContext);
}
