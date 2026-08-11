import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { Providers } from "@/app/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";
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
};

export const viewport: Viewport = {
  themeColor: "#131313",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const authUser = await getCurrentUser();
  const roles = authUser ? await getCurrentUserRoles() : [];
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
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-inter`}>
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
          >
            Skip to content
          </a>
          <Header user={user} />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
