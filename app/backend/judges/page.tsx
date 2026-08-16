import type { Metadata } from "next";

import { JudgesPanel, type JudgeRow } from "@/components/backend/JudgesPanel";
import { createClient } from "@/lib/supabase/server";
import type { BeyzIdStatus } from "@/lib/types/database";

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

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Judges</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Approved judges and their BeyZ ID certification status.</p>
      <div className="mt-8">
        <JudgesPanel judges={judges} />
      </div>
    </div>
  );
}
