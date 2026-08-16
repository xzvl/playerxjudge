import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { Providers } from "@/app/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser, getCurrentUserRoles, getUnreadNotificationCount } from "@/lib/supabase/get-user";
import { getActiveSponsors } from "@/lib/sponsors/queries";
import type { NavUser } from "@/components/layout/ProfileMenu";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playerxjudge.com";

export const metadata: Metadata = {
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

export const viewport: Viewport = {
  themeColor: "#131313",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authUser = await getCurrentUser();
  const [[roles, notificationCount], sponsors] = await Promise.all([
    authUser ? Promise.all([getCurrentUserRoles(), getUnreadNotificationCount()]) : Promise.resolve([[], 0] as const),
    getActiveSponsors(),
  ]);
  const user: NavUser | null = authUser
    ? {
        email: authUser.email ?? null,
        displayName:
          (authUser.user_metadata?.display_name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          "Player",
        avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
        isOrganizer: roles.some((r) => r.role === "organizer" && r.status === "approved"),
      }
    : null;

  return (
    // suppressHydrationWarning is scoped to this element's own attributes
    // only (not its subtree) — needed because the inline script below sets
    // data-theme on the real DOM before React hydrates, which would
    // otherwise always mismatch what the server actually rendered here.
    // Same caveat every "apply a saved theme via a pre-hydration script"
    // approach has (next-themes included).
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-inter`}>
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
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
          >
            Skip to content
          </a>
          <Header user={user} notificationCount={notificationCount} />
          <main id="main-content">{children}</main>
          <Footer sponsors={sponsors} />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
