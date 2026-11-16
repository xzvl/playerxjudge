// Site content managed from /backend/content (branding, header, hero,
// footer) and /backend/maintenance. Each section is one JSON document in
// `site_settings` (20250101000060_site_content_variations_ownership.sql).
// Client-safe: no server imports, so the editors share these types and
// normalizers with the server.

export type LinkTarget = "_self" | "_blank";

export interface NavLink {
  id: string;
  label: string;
  href: string;
  target: LinkTarget;
  // Footer only: the column heading this link sits under.
  group?: string;
}

export type SocialPlatform = "facebook" | "instagram" | "youtube" | "tiktok" | "x" | "discord" | "website";

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
  { value: "discord", label: "Discord" },
  { value: "website", label: "Website" },
];

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

export interface BrandingContent {
  // Main logo, shown on the dark theme (the default).
  logoUrl: string;
  // Alternative logo, shown on the light theme. Falls back to logoUrl.
  logoAltUrl: string;
  // Default favicon.
  faviconUrl: string;
  // Alternative favicon, used when the browser is in dark mode.
  faviconAltUrl: string;
  // Public contact email (footer, sponsor instructions).
  email: string;
}

export interface HeaderContent {
  links: NavLink[];
}

export interface ThemeColors {
  // Hex colors; empty = use the site theme.
  background: string;
  text: string;
}

export interface HeroContent {
  tag: string;
  title: string;
  // Rendered after `title`, in the brand red.
  titleRed: string;
  content: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  imageUrl: string;
  dark: ThemeColors;
  light: ThemeColors;
}

export interface FooterContent {
  links: NavLink[];
  socials: SocialLink[];
  // Short text under the social icons.
  note: string;
  // Bottom bar. `{year}` is replaced with the current year.
  copyright: string;
  tagline: string;
}

export interface MaintenanceContent {
  enabled: boolean;
  title: string;
  message: string;
}

export interface SiteContent {
  branding: BrandingContent;
  header: HeaderContent;
  hero: HeroContent;
  footer: FooterContent;
  maintenance: MaintenanceContent;
}

export type SiteSectionKey = keyof SiteContent;
export const SITE_SECTION_KEYS: SiteSectionKey[] = ["branding", "header", "hero", "footer", "maintenance"];

let idCounter = 0;
export function newId(prefix = "id"): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const link = (id: string, label: string, href: string, group?: string): NavLink => ({
  id,
  label,
  href,
  target: "_self",
  ...(group ? { group } : {}),
});

// Today's hard-coded site, so an empty table renders exactly as before.
export const DEFAULT_SITE_CONTENT: SiteContent = {
  branding: { logoUrl: "", logoAltUrl: "", faviconUrl: "", faviconAltUrl: "", email: "" },
  header: {
    links: [
      link("h-tournaments", "Tournaments", "/tournaments"),
      link("h-communities", "Communities", "/communities"),
      link("h-calendar", "Calendar", "/calendar"),
      link("h-leaderboard", "Leaderboard", "/leaderboard"),
      link("h-rules", "Rules", "/rules"),
    ],
  },
  hero: {
    tag: "Beyblade X Community Platform",
    title: "Beyblade X",
    titleRed: "Community Tournament",
    content:
      "Discover, register, and compete in Beyblade X tournaments near you. Track brackets, rankings, and communities — all in one platform built for players, judges, and organizers.",
    primaryLabel: "Browse tournaments",
    primaryHref: "/tournaments",
    secondaryLabel: "Register community",
    secondaryHref: "/become/organizer",
    imageUrl: "",
    dark: { background: "", text: "" },
    light: { background: "", text: "" },
  },
  footer: {
    links: [
      link("f-tournaments", "Tournaments", "/tournaments", "Navigation"),
      link("f-communities", "Communities", "/communities", "Navigation"),
      link("f-calendar", "Calendar", "/calendar", "Navigation"),
      link("f-leaderboard", "Leaderboard", "/leaderboard", "Navigation"),
      link("f-sponsors", "Sponsors", "/sponsors", "More"),
      link("f-faqs", "FAQs", "/faqs", "More"),
      link("f-how-to-use", "How to use", "/how-to-use", "More"),
      link("f-rules", "Rules", "/rules", "More"),
      link("f-terms", "Terms & Conditions", "/terms", "Legal"),
      link("f-privacy", "Privacy Policy", "/privacy", "Legal"),
    ],
    socials: [
      { id: "s-facebook", platform: "facebook", url: "https://facebook.com" },
      { id: "s-instagram", platform: "instagram", url: "https://instagram.com" },
      { id: "s-youtube", platform: "youtube", url: "https://youtube.com" },
    ],
    note: "The community tournament platform for Beyblade X players, judges, and organizers.",
    copyright: "© {year} PlayerXJudge. All rights reserved.",
    tagline: "",
  },
  maintenance: {
    enabled: false,
    title: "We'll be right back",
    message: "PlayerXJudge is down for scheduled maintenance. Please check back soon.",
  },
};

// ------------------------------------------------------------------
// Normalizers: turn whatever is stored (or posted) into a well-formed
// section, dropping unknown keys and clamping lengths. Used on read (so a
// hand-edited row can't break the site) and on save (validation).
// ------------------------------------------------------------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 500): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const color = (v: unknown): string => {
  const s = str(v, 7);
  return HEX.test(s) ? s : "";
};

// Relative paths, http(s), mailto and tel only — never javascript: etc.
export function safeHref(v: unknown): string {
  const s = str(v, 2000);
  if (!s) return "";
  if (s.startsWith("/") || s.startsWith("#")) return s;
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return "";
  // Bare domains ("facebook.com/x") become https.
  return `https://${s}`;
}

// Uploaded asset URLs: http(s) or root-relative only.
function assetUrl(v: unknown): string {
  const s = str(v, 2000);
  return s.startsWith("/") || /^https?:\/\//i.test(s) ? s : "";
}

function normalizeLinks(v: unknown, withGroup: boolean): NavLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(isObj)
    .slice(0, 40)
    .map((l, i) => {
      const out: NavLink = {
        id: str(l.id, 80) || `link-${i}`,
        label: str(l.label, 80),
        href: safeHref(l.href),
        target: l.target === "_blank" ? "_blank" : "_self",
      };
      if (withGroup) out.group = str(l.group, 40);
      return out;
    })
    .filter((l) => l.label && l.href);
}

function normalizeColors(v: unknown): ThemeColors {
  const o = isObj(v) ? v : {};
  return { background: color(o.background), text: color(o.text) };
}

export function normalizeBranding(v: unknown): BrandingContent {
  const o = isObj(v) ? v : {};
  const email = str(o.email, 200);
  return {
    logoUrl: assetUrl(o.logoUrl),
    logoAltUrl: assetUrl(o.logoAltUrl),
    faviconUrl: assetUrl(o.faviconUrl),
    faviconAltUrl: assetUrl(o.faviconAltUrl),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
  };
}

export function normalizeHeader(v: unknown): HeaderContent {
  const o = isObj(v) ? v : {};
  return { links: Array.isArray(o.links) ? normalizeLinks(o.links, false) : DEFAULT_SITE_CONTENT.header.links };
}

export function normalizeHero(v: unknown): HeroContent {
  const d = DEFAULT_SITE_CONTENT.hero;
  if (!isObj(v)) return d;
  return {
    tag: str(v.tag, 120),
    title: str(v.title, 120),
    titleRed: str(v.titleRed, 120),
    content: str(v.content, 1000),
    primaryLabel: str(v.primaryLabel, 60),
    primaryHref: safeHref(v.primaryHref),
    secondaryLabel: str(v.secondaryLabel, 60),
    secondaryHref: safeHref(v.secondaryHref),
    imageUrl: assetUrl(v.imageUrl),
    dark: normalizeColors(v.dark),
    light: normalizeColors(v.light),
  };
}

export function normalizeFooter(v: unknown): FooterContent {
  const d = DEFAULT_SITE_CONTENT.footer;
  if (!isObj(v)) return d;
  const platforms = new Set(SOCIAL_PLATFORMS.map((p) => p.value));
  return {
    links: Array.isArray(v.links) ? normalizeLinks(v.links, true) : d.links,
    socials: Array.isArray(v.socials)
      ? v.socials
          .filter(isObj)
          .slice(0, 20)
          .map((s, i) => ({
            id: str(s.id, 80) || `social-${i}`,
            platform: (platforms.has(s.platform as SocialPlatform) ? s.platform : "website") as SocialPlatform,
            url: safeHref(s.url),
          }))
          .filter((s) => s.url)
      : d.socials,
    note: str(v.note, 400),
    copyright: str(v.copyright, 200),
    tagline: str(v.tagline, 200),
  };
}

export function normalizeMaintenance(v: unknown): MaintenanceContent {
  const d = DEFAULT_SITE_CONTENT.maintenance;
  if (!isObj(v)) return d;
  return {
    enabled: v.enabled === true,
    title: str(v.title, 120) || d.title,
    message: str(v.message, 2000),
  };
}

export const SECTION_NORMALIZERS: { [K in SiteSectionKey]: (v: unknown) => SiteContent[K] } = {
  branding: normalizeBranding,
  header: normalizeHeader,
  hero: normalizeHero,
  footer: normalizeFooter,
  maintenance: normalizeMaintenance,
};

export function formatCopyright(text: string): string {
  return text.replace(/\{year\}/g, String(new Date().getFullYear()));
}
