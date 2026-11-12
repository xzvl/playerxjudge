import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateTournamentWizard } from "@/components/tournaments/wizard/CreateTournamentWizard";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = {
  title: "Create Tournament",
  robots: { index: false, follow: false },
};

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/tournament/new");

  const supabase = await createClient();
  const { data: communities } = await supabase.from("communities").select("id, name").eq("owner_id", user.id).order("name");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Organizer"
        title="Create Tournament"
        description="Set up your bracket format, registration, and advanced options."
      />
      <div className="mt-10">
        <CreateTournamentWizard communities={communities ?? []} />
      </div>
    </div>
  );
}
