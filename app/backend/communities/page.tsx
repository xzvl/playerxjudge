import type { Metadata } from "next";
import { Building2, CircleCheck, Clock3, Users } from "lucide-react";

import { CommunitiesPanel, type CommunityItem, type PendingCommunityItem } from "@/components/backend/CommunitiesPanel";
import { createClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Communities", robots: { index: false, follow: false } };

interface CommunityWithOwnerRow extends CommunityRow {
  profiles: { display_name: string } | null;
}

function locationLine(community: CommunityRow): string {
  return [community.address_line, community.city, community.province].filter(Boolean).join(", ") || "—";
}

export default async function BackendCommunitiesPage() {
  const supabase = await createClient();
  // profiles(...) alone is ambiguous — profiles has two FKs to communities
  // (communities.owner_id, and profiles.community_id for a member's "home
  // community"); this is about the community's owner.
  const { data } = await supabase
    .from("communities")
    .select("*, profiles!communities_owner_id_fkey(display_name)")
    .order("created_at", { ascending: false });

  const all = (data as unknown as CommunityWithOwnerRow[] | null) ?? [];

  const pending: PendingCommunityItem[] = all
    .filter((c) => c.approval_status === "pending")
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logo_url,
      locationLine: locationLine(c),
      ownerName: c.profiles?.display_name ?? "Unknown",
      submittedAt: c.created_at,
    }));

  const communities: CommunityItem[] = all
    .filter((c) => c.approval_status !== "pending")
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      approvalStatus: c.approval_status,
      memberCount: c.member_count,
      ownerName: c.profiles?.display_name ?? "Unknown",
    }));

  const activeCount = communities.filter((c) => c.status === "active").length;
  const totalMembers = communities.reduce((sum, c) => sum + (c.memberCount ?? 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Communities"
        description="Applications waiting for review, and every community on the platform."
      />
      <KpiGrid>
        <KpiCard label="Communities" value={communities.length} icon={Building2} emphasis hint="Approved on the platform" />
        <KpiCard label="Pending applications" value={pending.length} icon={Clock3} hint="Waiting for review" />
        <KpiCard label="Active" value={activeCount} icon={CircleCheck} hint={`${communities.length - activeCount} inactive`} />
        <KpiCard label="Total members" value={totalMembers.toLocaleString()} icon={Users} hint="Across all communities" />
      </KpiGrid>
      <div>
        <CommunitiesPanel pending={pending} communities={communities} />
      </div>
    </div>
  );
}
