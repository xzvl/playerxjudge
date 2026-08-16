import type { Metadata } from "next";

import { OrganizersPanel, type OrganizerRow } from "@/components/backend/OrganizersPanel";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/lib/types/database";

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

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Organizers</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Everyone with an approved organizer role.</p>
      <div className="mt-8">
        <OrganizersPanel organizers={organizers} />
      </div>
    </div>
  );
}
