import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { decideRoleRequest } from "@/app/dashboard/admin/actions";

export const metadata: Metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

const OTHER_FEATURES = [
  "Manage Users",
  "Manage Communities",
  "Manage Sponsors",
  "Manage Subscriptions",
  "Platform Analytics",
  "Audit Logs",
  "CMS",
  "Feature Flags",
  "Announcements",
];

interface PendingRoleRequest {
  id: string;
  role: string;
  requested_at: string;
  profiles: { username: string; display_name: string } | null;
}

export default async function AdminDashboardPage() {
  let requests: PendingRoleRequest[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_roles")
      // `profiles!profile_roles_profile_id_fkey` disambiguates the embed —
      // profile_roles has two FKs into profiles (profile_id and
      // decided_by), so the bare `profiles(...)` shorthand is rejected as
      // ambiguous (PGRST201).
      .select("id, role, requested_at, profiles!profile_roles_profile_id_fkey(username, display_name)")
      .eq("status", "pending")
      .order("requested_at");

    requests = (data as unknown as PendingRoleRequest[] | null) ?? [];
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="heading text-2xl">Admin Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          Platform-wide management tools for users, communities, sponsors, and subscriptions.
        </p>
      </div>

      <section>
        <h2 className="label-mono mb-4 flex items-center gap-2 text-primary">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Role Requests
        </h2>
        {requests.length === 0 ? (
          <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-sm text-on-surface/50">
            No pending requests.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {request.profiles?.display_name ?? "Unknown"}{" "}
                      <span className="text-on-surface/40">@{request.profiles?.username}</span>
                    </p>
                    <p className="label-mono mt-1 text-primary">{request.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <form action={decideRoleRequest.bind(null, request.id, "approved")}>
                      <Button type="submit" size="sm" tooltip="Approve this role request">
                        Approve
                      </Button>
                    </form>
                    <form action={decideRoleRequest.bind(null, request.id, "rejected")}>
                      <Button type="submit" size="sm" variant="outline" tooltip="Reject this role request">
                        Reject
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="label-mono mb-4 text-on-surface/40">More Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_FEATURES.map((feature) => (
            <Card key={feature}>
              <CardHeader>
                <CardTitle className="text-base">{feature}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-on-surface/50">Coming in the next build phase.</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
