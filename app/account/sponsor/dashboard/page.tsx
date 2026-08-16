import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SponsorListingsPanel } from "@/components/dashboard/sponsor/SponsorListingsPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/lib/types/database";

export const metadata: Metadata = { title: "Sponsor Dashboard", robots: { index: false, follow: false } };

export default async function SponsorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/sponsor/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("sponsors")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const listings = (data as Sponsor[] | null) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-mono text-primary">Sponsor Dashboard</p>
          <h1 className="heading mt-2 text-3xl">Sponsor Listings</h1>
          <p className="mt-2 max-w-xl text-sm text-on-surface/60">
            Manage the sponsor listings tied to your account.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5" tooltip="Create a new sponsor listing">
          <Link href="/account/sponsor/new">
            <Plus className="h-3.5 w-3.5" /> New Listing
          </Link>
        </Button>
      </div>
      <div className="mt-8">
        <SponsorListingsPanel items={listings} />
      </div>
    </div>
  );
}
