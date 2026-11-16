import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  DEFAULT_SITE_CONTENT,
  SECTION_NORMALIZERS,
  SITE_SECTION_KEYS,
  type SiteContent,
  type SiteSectionKey,
} from "@/lib/site-content/schema";

// Invalidated by every save in /backend/content and /backend/maintenance.
export const SITE_CONTENT_CACHE_TAG = "site-content";

// The root layout renders this on every page, and it's the same for every
// visitor, so it's cached across requests (5 min, or immediately on save).
// Any section that's missing, or the whole table not existing yet (before
// migration 060 runs), falls back to the built-in defaults.
const loadSiteContent = unstable_cache(
  async (): Promise<SiteContent> => {
    const { data, error } = await createPublicClient().from("site_settings").select("key, value");
    if (error || !data) return DEFAULT_SITE_CONTENT;

    const content: SiteContent = { ...DEFAULT_SITE_CONTENT };
    for (const row of data as { key: string; value: unknown }[]) {
      if (!SITE_SECTION_KEYS.includes(row.key as SiteSectionKey)) continue;
      const key = row.key as SiteSectionKey;
      (content as Record<SiteSectionKey, unknown>)[key] = SECTION_NORMALIZERS[key](row.value);
    }
    return content;
  },
  ["site-content"],
  { revalidate: 300, tags: [SITE_CONTENT_CACHE_TAG] }
);

export async function getSiteContent(): Promise<SiteContent> {
  if (!isSupabaseConfigured) return DEFAULT_SITE_CONTENT;
  try {
    return await loadSiteContent();
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}
