import type { Metadata } from "next";
import { Crown, UserPlus, Users2 } from "lucide-react";

import { OrganizersPanel, type OrganizerRow } from "@/components/backend/OrganizersPanel";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Organizers", robots: { index: false, follow: false } };

interface OrganizerRoleRow {
  id: string;
  decided_at: string | null;
  profiles: { id: string; username: string; display_name: string; subscription_plan: SubscriptionPlan } | null;
}

export default async function OrganizersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_roles")
    .select("id, decided_at, profiles!profile_roles_profile_id_fkey(id, username, display_name, subscription_plan)")
    .eq("role", "organizer")
    .eq("status", "approved")
    .order("decided_at", { ascending: false });

  const organizers: OrganizerRow[] = ((data as unknown as OrganizerRoleRow[] | null) ?? [])
    .filter((r): r is OrganizerRoleRow & { profiles: NonNullable<OrganizerRoleRow["profiles"]> } => r.profiles !== null)
    .map((r) => ({
      roleRowId: r.id,
      profileId: r.profiles.id,
      displayName: r.profiles.display_name,
      username: r.profiles.username,
      tier: r.profiles.subscription_plan,
      approvedAt: r.decided_at,
    }));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const premiumCount = organizers.filter((o) => o.tier === "premium").length;
  const recentCount = organizers.filter((o) => o.approvedAt && new Date(o.approvedAt).getTime() >= thirtyDaysAgo).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Organizers"
        description="Everyone with an approved organizer role."
      />
      <KpiGrid className="xl:grid-cols-3">
        <KpiCard label="Organizers" value={organizers.length} icon={Users2} emphasis hint="Approved organizer roles" />
        <KpiCard label="Premium" value={premiumCount} icon={Crown} hint={`${organizers.length - premiumCount} on the free plan`} />
        <KpiCard label="Approved last 30 days" value={recentCount} icon={UserPlus} hint="Newly onboarded" />
      </KpiGrid>
      <div>
        <OrganizersPanel organizers={organizers} />
      </div>
    </div>
  );
}
