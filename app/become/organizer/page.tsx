import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizerApplicationForm } from "@/components/become/OrganizerApplicationForm";
import { RoleStatusBadge } from "@/components/roles/RoleStatusBadge";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Become an Organizer",
  description: "Apply to run Beyblade X tournaments as a free or premium organizer.",
};

export default async function BecomeOrganizerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/become/organizer");

  const roles = await getCurrentUserRoles();
  const existing = roles.find((r) => r.role === "organizer");

  return (
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <ClipboardList className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Organize</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Become an Organizer</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Pick a tier and apply — an admin reviews every organizer application before it goes live.
          </p>
        </div>

        {existing ? (
          <Card className="mt-12">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                Application status <RoleStatusBadge status={existing.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-on-surface/60">
              {existing.status === "pending"
                ? "Your organizer application is waiting for admin review."
                : null}
              {existing.status === "approved" ? (
                <>
                  You&apos;re an approved organizer.{" "}
                  <Link href="/account/organizer/dashboard" className="text-primary hover:underline">
                    Go to your dashboard
                  </Link>
                  .
                </>
              ) : null}
              {existing.status === "rejected" ? "Your organizer application was not approved." : null}
            </CardContent>
          </Card>
        ) : (
          <div className="mt-12">
            <OrganizerApplicationForm />
          </div>
        )}
      </div>
    </div>
  );
}
