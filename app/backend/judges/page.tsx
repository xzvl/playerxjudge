import type { Metadata } from "next";
import { BadgeCheck, Clock3, FileQuestion, Gavel } from "lucide-react";

import { JudgesPanel, type JudgeRow } from "@/components/backend/JudgesPanel";
import { createClient } from "@/lib/supabase/server";
import type { BeyzIdStatus } from "@/lib/types/database";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Judges", robots: { index: false, follow: false } };

interface JudgeRoleRow {
  id: string;
  profiles: { id: string; username: string; display_name: string; beyz_id_url: string | null; beyz_id_status: BeyzIdStatus | null } | null;
}

export default async function JudgesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_roles")
    .select("id, profiles!profile_roles_profile_id_fkey(id, username, display_name, beyz_id_url, beyz_id_status)")
    .eq("role", "judge")
    .eq("status", "approved");

  const judges: JudgeRow[] = ((data as unknown as JudgeRoleRow[] | null) ?? [])
    .filter((r): r is JudgeRoleRow & { profiles: NonNullable<JudgeRoleRow["profiles"]> } => r.profiles !== null)
    .map((r) => ({
      roleRowId: r.id,
      profileId: r.profiles.id,
      displayName: r.profiles.display_name,
      username: r.profiles.username,
      beyzIdUrl: r.profiles.beyz_id_url,
      beyzIdStatus: r.profiles.beyz_id_status,
    }));

  const certifiedCount = judges.filter((j) => j.beyzIdStatus === "approved").length;
  const reviewCount = judges.filter((j) => j.beyzIdStatus === "pending").length;
  const missingCount = judges.filter((j) => !j.beyzIdUrl).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Judges"
        description="Approved judges and their BeyZ ID certification status."
      />
      <KpiGrid>
        <KpiCard label="Judges" value={judges.length} icon={Gavel} emphasis hint="Approved judge roles" />
        <KpiCard label="Certified" value={certifiedCount} icon={BadgeCheck} hint="BeyZ ID approved" />
        <KpiCard label="Awaiting review" value={reviewCount} icon={Clock3} hint="BeyZ ID submitted" />
        <KpiCard label="No BeyZ ID" value={missingCount} icon={FileQuestion} hint="Nothing uploaded yet" />
      </KpiGrid>
      <div>
        <JudgesPanel judges={judges} />
      </div>
    </div>
  );
}
