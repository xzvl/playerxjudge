import type { Metadata } from "next";
import { BadgeCheck, Building2, ClipboardList, Handshake, Inbox, ListChecks } from "lucide-react";

import { BarList } from "@/components/dashboard/charts";
import { KpiCard, KpiGrid, PageHeader, Panel } from "@/components/dashboard/erp";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Backend", robots: { index: false, follow: false } };

export default async function BackendDashboardPage() {
  const supabase = await createClient();
  const [{ count: pendingRoles }, { count: pendingCommunities }, { count: pendingSponsors }, { count: pendingBeyzIds }, { count: pendingLinks }] =
    await Promise.all([
      supabase.from("profile_roles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("communities").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("sponsors").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("beyz_id_status", "pending"),
      supabase.from("participant_links").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const tiles = [
    { label: "Role Applications", count: pendingRoles ?? 0, href: "/backend/role-applications", icon: ClipboardList },
    { label: "Community Applications", count: pendingCommunities ?? 0, href: "/backend/communities", icon: Building2 },
    { label: "Sponsor Listings", count: pendingSponsors ?? 0, href: "/backend/sponsors", icon: Handshake },
    { label: "BeyZ ID Reviews", count: pendingBeyzIds ?? 0, href: "/backend/judges", icon: BadgeCheck },
    { label: "Participant Links", count: pendingLinks ?? 0, href: "/backend/participants", icon: ListChecks },
  ];
  const totalPending = tiles.reduce((sum, t) => sum + t.count, 0);
  const busiest = [...tiles].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Backend" title="Overview" description="Everything waiting on your review, across the whole platform." />

      <div className="grid gap-3 lg:grid-cols-3">
        <KpiCard
          label="Total pending"
          value={totalPending.toLocaleString()}
          icon={Inbox}
          emphasis
          hint={totalPending > 0 && busiest ? `Largest queue: ${busiest.label}` : "All queues are clear"}
        />
        <Panel title="Review queue" icon={ListChecks} meta={`${tiles.length} queues`} className="lg:col-span-2">
          <BarList
            items={tiles.map((t) => ({ label: t.label, value: t.count, href: t.href }))}
            emptyLabel="Nothing waiting."
          />
        </Panel>
      </div>

      <KpiGrid className="xl:grid-cols-5">
        {tiles.map((tile) => (
          <KpiCard key={tile.href} label={tile.label} value={tile.count} icon={tile.icon} href={tile.href} hint="Pending review" />
        ))}
      </KpiGrid>
    </div>
  );
}
