import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TournamentManagementPanel } from "@/components/dashboard/organizer/TournamentManagementPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Tournament } from "@/lib/types/database";

export const metadata: Metadata = { title: "Tournament Management", robots: { index: false, follow: false } };

export default async function TournamentManagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/tournament");

  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="label-mono text-primary">Organizer Dashboard</p>
      <h1 className="heading mt-2 text-3xl">Tournament Management</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Every tournament you organize, from draft to completed.</p>
      <div className="mt-8">
        <TournamentManagementPanel tournaments={(data as Tournament[] | null) ?? []} />
      </div>
    </div>
  );
}
