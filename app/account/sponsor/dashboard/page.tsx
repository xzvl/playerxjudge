import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, Layers, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid, PageHeader } from "@/components/dashboard/erp";
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
  const approvedCount = listings.filter((l) => l.approval_status === "approved").length;
  const pendingCount = listings.filter((l) => l.approval_status === "pending").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sponsor Dashboard"
        title="Sponsor Listings"
        description="Manage the sponsor listings tied to your account."
        actions={
          <Button asChild size="sm" className="gap-1.5" tooltip="Create a new sponsor listing">
            <Link href="/account/sponsor/new">
              <Plus className="h-3.5 w-3.5" /> New Listing
            </Link>
          </Button>
        }
      />
      <KpiGrid className="xl:grid-cols-3">
        <KpiCard label="Total listings" value={listings.length} icon={Layers} emphasis hint="Tied to your account" />
        <KpiCard label="Approved" value={approvedCount} icon={CheckCircle2} hint="Live on the sponsor marquee" />
        <KpiCard label="Pending review" value={pendingCount} icon={Clock3} hint="Waiting on an admin" />
      </KpiGrid>
      <div>
        <SponsorListingsPanel items={listings} />
      </div>
    </div>
  );
}
