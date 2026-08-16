import type { Metadata } from "next";

import { RoleApplicationsPanel, type RoleApplicationItem } from "@/components/backend/RoleApplicationsPanel";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

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

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Role Applications</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Organizer, judge, and sponsor applications waiting for review.</p>
      <div className="mt-8">
        <RoleApplicationsPanel items={items} />
      </div>
    </div>
  );
}
