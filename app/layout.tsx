import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow, Chakra_Petch, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { Providers } from "@/app/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";
import { SiteBrandingProvider } from "@/components/layout/SiteBrandingProvider";
import { getCurrentProfile, getShellData, isStaffProfile } from "@/lib/supabase/get-user";
import { getActiveSponsors } from "@/lib/sponsors/queries";
import { getSiteContent } from "@/lib/site-content/queries";
import type { NavUser } from "@/components/layout/ProfileMenu";

// The site's one type family: Geist for text, Geist Mono for codes and
// figures (`font-mono`).
// Barlow for text and labels, kept on the --font-geist variable so every
// existing `font-sans` reference follows.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

// Chakra Petch: headings, menus and buttons.
const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playerxjudge.com";

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PlayerXJudge — Beyblade X Community Tournament Platform",
    template: "%s | PlayerXJudge",
  },
  description:
    "Discover, join, and organize Beyblade X community tournaments. Track brackets, leaderboards, and communities in one place.",
  openGraph: {
    type: "website",
    siteName: "PlayerXJudge",
    title: "PlayerXJudge — Beyblade X Community Tournament Platform",
    description:
      "Discover, join, and organize Beyblade X community tournaments. Track brackets, leaderboards, and communities in one place.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayerXJudge — Beyblade X Community Tournament Platform",
    description:
      "Discover, join, and organize Beyblade X community tournaments. Track brackets, leaderboards, and communities in one place.",
  },
  robots: { index: true, follow: true },
  // app/favicon.ico is already picked up by Next's file convention on its
  // own, but declaring it explicitly guarantees the <link rel="icon"> tag
  // lands in <head> rather than relying on that convention silently.
  icons: { icon: "/favicon.ico" },
};

// Favicons uploaded in /backend/content replace the built-in one; the
// alternative favicon is used when the browser is in dark mode.
export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getSiteContent();
  if (!branding.faviconUrl && !branding.faviconAltUrl) return baseMetadata;

  const icon = branding.faviconUrl || branding.faviconAltUrl;
  const darkIcon = branding.faviconAltUrl || branding.faviconUrl;
  return {
    ...baseMetadata,
    icons: {
      icon:
        icon === darkIcon
          ? [{ url: icon }]
          : [
              { url: icon, media: "(prefers-color-scheme: light)" },
              { url: darkIcon, media: "(prefers-color-scheme: dark)" },
            ],
      apple: icon,
    },
  };
}

// Maintenance mode never blocks these: staff need to sign in and reach
// /backend to turn it off again.
const MAINTENANCE_ALLOWED = ["/backend", "/login", "/auth", "/api"];
const isMaintenanceAllowed = (pathname: string) =>
  MAINTENANCE_ALLOWED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const viewport: Viewport = {
  themeColor: "#09090e",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // getShellData is cache()'d, so the dashboard layouts reuse this same
  // batch instead of querying again. Sponsors are cached across requests.
  const [shell, sponsors, content] = await Promise.all([getShellData(), getActiveSponsors(), getSiteContent()]);
  const user: NavUser | null = shell?.navUser ?? null;
  const notificationCount = shell?.notificationCount ?? 0;

  let showMaintenance = false;
  if (content.maintenance.enabled) {
    const pathname = (await headers()).get("x-pathname") ?? "/";
    if (!isMaintenanceAllowed(pathname)) {
      const profile = shell ? await getCurrentProfile() : null;
      showMaintenance = !(shell && isStaffProfile(profile, shell.roles));
    }
  }

  return (
    // suppressHydrationWarning is scoped to this element's own attributes
    // only (not its subtree) — needed because the inline script below sets
    // data-theme on the real DOM before React hydrates, which would
    // otherwise always mismatch what the server actually rendered here.
    // Same caveat every "apply a saved theme via a pre-hydration script"
    // approach has (next-themes included).
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${barlow.variable} ${geistMono.variable} ${display.variable} erp font-sans`}>
        {/* Applies a saved light-theme preference before first paint — see
            ThemeToggle. Runs as the first thing in <body> (before anything
            else is parsed) so there's no flash of the wrong theme; the
            default (this script doing nothing) is the dark palette
            <html>/globals.css already render without it. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}})();',
          }}
        />
        <Providers>
          <SiteBrandingProvider branding={content.branding}>
            {showMaintenance ? (
              <MaintenanceScreen content={content.maintenance} email={content.branding.email} />
            ) : (
              <>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
                >
                  Skip to content
                </a>
                <Header user={user} notificationCount={notificationCount} links={content.header.links} />
                <main id="main-content">{children}</main>
                <Footer sponsors={sponsors} content={content.footer} email={content.branding.email} />
                <MobileTabBar signedIn={!!user} />
              </>
            )}
          </SiteBrandingProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
