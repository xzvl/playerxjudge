import { createClient } from "@/lib/supabase/server";
import { sponsorListingStatus } from "@/lib/sponsors/status";
import type { Sponsor } from "@/lib/types/database";

// Server-only — pulled into the root layout for the footer's "Our
// Sponsors" marquee (components/marquee/SponsorMarquee.tsx), which is
// itself rendered from a client component (Footer) and so can't fetch this
// directly. Kept out of lib/sponsors/status.ts, which client components
// also import, so that file stays free of the server-only Supabase client.
export type MarqueeSponsor = Pick<Sponsor, "id" | "company_name" | "logo_url" | "website_url" | "facebook_url">;

// "sponsors_select_all" (RLS) lets anyone read every sponsor row regardless
// of approval/expiry, so the approved-and-not-expired filter has to happen
// here — same definition of "active" as the dashboard's status badge
// (sponsorListingStatus), just applied to the public-facing list instead of
// an owner's own listings.
export async function getActiveSponsors(): Promise<MarqueeSponsor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sponsors")
    .select("id, company_name, logo_url, website_url, facebook_url, approval_status, tier_expires_at")
    .eq("approval_status", "approved")
    .order("company_name");

  return ((data as Sponsor[] | null) ?? []).filter((sponsor) => sponsorListingStatus(sponsor) === "active");
}
