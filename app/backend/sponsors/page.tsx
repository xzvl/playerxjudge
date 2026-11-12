import type { Metadata } from "next";
import { CircleCheck, CircleX, Clock3, Handshake } from "lucide-react";

import { SponsorsPanel, type SponsorItem } from "@/components/backend/SponsorsPanel";
import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";

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

  const approvedCount = sponsors.filter((s) => s.approvalStatus === "approved").length;
  const pendingCount = sponsors.filter((s) => s.approvalStatus === "pending").length;
  const declinedCount = sponsors.filter((s) => s.approvalStatus === "declined").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Sponsors"
        description="Every sponsor listing, pending and active."
      />
      <KpiGrid>
        <KpiCard label="Listings" value={sponsors.length} icon={Handshake} emphasis hint="All sponsor listings" />
        <KpiCard label="Approved" value={approvedCount} icon={CircleCheck} hint="Live on the marquee" />
        <KpiCard label="Pending" value={pendingCount} icon={Clock3} hint="Waiting for review" />
        <KpiCard label="Declined" value={declinedCount} icon={CircleX} hint="Not approved" />
      </KpiGrid>
      <div>
        <SponsorsPanel sponsors={sponsors} />
      </div>
    </div>
  );
}
