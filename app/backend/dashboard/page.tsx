import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Building2, ClipboardList, Handshake, ListChecks } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">Overview</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Everything waiting on your review, across the whole platform.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="block">
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-outline-variant/40 text-primary">
                  <tile.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-2xl font-bold text-on-surface">{tile.count}</p>
                  <p className="label-mono text-on-surface/50">{tile.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
