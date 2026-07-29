import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://playerxjudge.com";

const STATIC_ROUTES = [
  "",
  "/tournaments",
  "/communities",
  "/organizer",
  "/player",
  "/judge",
  "/calendar",
  "/leaderboard",
  "/rules",
  "/map",
  "/join-community",
  "/sponsors",
  "/sponsors/become",
  "/faqs",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
