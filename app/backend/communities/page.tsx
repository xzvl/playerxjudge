import type { Metadata } from "next";

import { CommunitiesPanel, type CommunityItem, type PendingCommunityItem } from "@/components/backend/CommunitiesPanel";
import { createClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/lib/types/database";

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

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Communities</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Applications waiting for review, and every community on the platform.</p>
      <div className="mt-8">
        <CommunitiesPanel pending={pending} communities={communities} />
      </div>
    </div>
  );
}
