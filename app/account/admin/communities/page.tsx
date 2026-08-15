import type { Metadata } from "next";

import { CommunityApprovalPanel, type PendingCommunityItem } from "@/components/dashboard/admin/CommunityApprovalPanel";
import { createClient } from "@/lib/supabase/server";
import type { CommunityRow } from "@/lib/types/database";

export const metadata: Metadata = { title: "Community Applications", robots: { index: false, follow: false } };

interface PendingCommunityRow extends CommunityRow {
  profiles: { display_name: string } | null;
}

function locationLine(community: CommunityRow): string {
  return [community.address_line, community.city, community.province].filter(Boolean).join(", ") || "—";
}

// Access is gated one level up by app/account/admin/layout.tsx (admin/
// super_admin only) — nothing further to check here.
export default async function AdminCommunityApplicationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("*, profiles(display_name)")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true });

  const items: PendingCommunityItem[] = ((data as unknown as PendingCommunityRow[] | null) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logo_url,
    locationLine: locationLine(c),
    ownerName: c.profiles?.display_name ?? "Unknown",
    submittedAt: c.created_at,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Admin</p>
      <h1 className="heading mt-2 text-3xl">Community Applications</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        New communities wait here until approved — see the &quot;Submit Application&quot; step of the Create Community form.
      </p>
      <div className="mt-8">
        <CommunityApprovalPanel items={items} />
      </div>
    </div>
  );
}
