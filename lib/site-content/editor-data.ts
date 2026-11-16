import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_SITE_CONTENT,
  SECTION_NORMALIZERS,
  SITE_SECTION_KEYS,
  type SiteContent,
  type SiteSectionKey,
} from "@/lib/site-content/schema";

// Uncached read for the /backend editors, so they always open on what's
// actually stored (the public site reads through the cache in queries.ts).
export async function getSiteContentFresh(): Promise<SiteContent> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("key, value");
  const content: SiteContent = { ...DEFAULT_SITE_CONTENT };
  if (error || !data) return content;

  for (const row of data as { key: string; value: unknown }[]) {
    if (!SITE_SECTION_KEYS.includes(row.key as SiteSectionKey)) continue;
    const key = row.key as SiteSectionKey;
    (content as Record<SiteSectionKey, unknown>)[key] = SECTION_NORMALIZERS[key](row.value);
  }
  return content;
}
