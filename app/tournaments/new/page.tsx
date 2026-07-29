import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { getCurrentUser } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Create Tournament",
  robots: { index: false, follow: false },
};

export default async function NewTournamentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/tournaments/new");

  return (
    <PagePlaceholder
      eyebrow="Organizer"
      title="Create Tournament"
      description="The tournament creation wizard (rules, location, prizes, schedule, bracket format) is coming in the next build phase."
      Icon={Plus}
    />
  );
}
