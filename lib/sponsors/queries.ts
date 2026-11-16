import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { sponsorListingStatus } from "@/lib/sponsors/status";
import type { Sponsor } from "@/lib/types/database";

// Server-only: pulled into the root layout for the footer's "Our Sponsors"
// marquee (components/marquee/SponsorMarquee.tsx). Kept out of
// lib/sponsors/status.ts, which client components also import.
export type MarqueeSponsor = Pick<Sponsor, "id" | "company_name" | "logo_url" | "logo_light_url" | "website_url" | "facebook_url">;

// Tag for invalidating the cached list (see revalidateSponsorMarquee).
export const SPONSORS_CACHE_TAG = "sponsors";

// The root layout renders on every page, so this used to be a database
// query on every request. It's the same for every visitor, so it's cached
// across requests: refreshed at most every 5 minutes (which also picks up
// listings whose tier just expired), and immediately when a listing is
// approved/declined/edited/deleted (revalidateTag(SPONSORS_CACHE_TAG)).
//
// "sponsors_select_all" (RLS) lets anyone read every sponsor row regardless
// of approval/expiry, so the approved-and-not-expired filter happens here,
// same definition of "active" as the dashboard's status badge.
const loadActiveSponsors = unstable_cache(
  async (): Promise<MarqueeSponsor[]> => {
    const { data } = await createPublicClient()
      .from("sponsors")
      .select("id, company_name, logo_url, logo_light_url, website_url, facebook_url, approval_status, tier_expires_at")
      .eq("approval_status", "approved")
      .order("company_name");

    return ((data as Sponsor[] | null) ?? [])
      .filter((sponsor) => sponsorListingStatus(sponsor) === "active")
      .map(({ id, company_name, logo_url, logo_light_url, website_url, facebook_url }) => ({
        id,
        company_name,
        logo_url,
        logo_light_url,
        website_url,
        facebook_url,
      }));
  },
  ["active-sponsors"],
  { revalidate: 300, tags: [SPONSORS_CACHE_TAG] }
);

export async function getActiveSponsors(): Promise<MarqueeSponsor[]> {
  if (!isSupabaseConfigured) return [];
  return loadActiveSponsors();
}
