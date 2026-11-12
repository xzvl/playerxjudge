import type { Metadata } from "next";
import { ClipboardList, Gavel, Handshake, Users2 } from "lucide-react";

import { RoleApplicationsPanel, type RoleApplicationItem } from "@/components/backend/RoleApplicationsPanel";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Role Applications", robots: { index: false, follow: false } };

interface PendingRoleRow {
  id: string;
  role: AppRole;
  requested_at: string;
  profiles: { username: string; display_name: string } | null;
}

export default async function RoleApplicationsPage() {
  const supabase = await createClient();
  // `profiles!profile_roles_profile_id_fkey` disambiguates — profile_roles
  // has two FKs into profiles (profile_id and decided_by).
  const { data } = await supabase
    .from("profile_roles")
    .select("id, role, requested_at, profiles!profile_roles_profile_id_fkey(username, display_name)")
    .eq("status", "pending")
    .order("requested_at");

  const items: RoleApplicationItem[] = ((data as unknown as PendingRoleRow[] | null) ?? []).map((r) => ({
    id: r.id,
    role: r.role,
    requestedAt: r.requested_at,
    applicantName: r.profiles?.display_name ?? "Unknown",
    applicantUsername: r.profiles?.username ?? "unknown",
  }));

  const countFor = (role: AppRole) => items.filter((i) => i.role === role).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Role Applications"
        description="Organizer, judge, and sponsor applications waiting for review."
      />
      <KpiGrid>
        <KpiCard label="Pending applications" value={items.length} icon={ClipboardList} emphasis hint="Waiting for review" />
        <KpiCard label="Organizer" value={countFor("organizer")} icon={Users2} hint="Applications" />
        <KpiCard label="Judge" value={countFor("judge")} icon={Gavel} hint="Applications" />
        <KpiCard label="Sponsor" value={countFor("sponsor")} icon={Handshake} hint="Applications" />
      </KpiGrid>
      <div>
        <RoleApplicationsPanel items={items} />
      </div>
    </div>
  );
}
