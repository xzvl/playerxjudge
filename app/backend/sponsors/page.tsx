import type { Metadata } from "next";

import { SponsorsPanel, type SponsorItem } from "@/components/backend/SponsorsPanel";
import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/lib/types/database";

export const metadata: Metadata = { title: "Sponsors", robots: { index: false, follow: false } };

interface SponsorWithOwnerRow extends Sponsor {
  profiles: { display_name: string } | null;
}

export default async function BackendSponsorsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("sponsors").select("*, profiles(display_name)").order("created_at", { ascending: false });

  const sponsors: SponsorItem[] = ((data as unknown as SponsorWithOwnerRow[] | null) ?? []).map((s) => ({
    id: s.id,
    companyName: s.company_name,
    websiteUrl: s.website_url,
    facebookUrl: s.facebook_url,
    donationTier: s.donation_tier,
    tierExpiresAt: s.tier_expires_at,
    approvalStatus: s.approval_status,
    ownerName: s.profiles?.display_name ?? "Unknown",
  }));

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Sponsors</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every sponsor listing, pending and active.</p>
      <div className="mt-8">
        <SponsorsPanel sponsors={sponsors} />
      </div>
    </div>
  );
}
