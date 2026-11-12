import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorApplicationForm } from "@/components/become/SponsorApplicationForm";
import { RoleStatusBadge } from "@/components/roles/RoleStatusBadge";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Become a Sponsor",
  description: "Apply to sponsor Beyblade X communities and tournaments.",
};

export default async function BecomeSponsorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/become/sponsor");

  const roles = await getCurrentUserRoles();
  const existing = roles.find((r) => r.role === "sponsor");

  return (
    <div className="px-4 py-12 md:px-6">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
            <Handshake className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
          </div>
          <p className="label-mono mt-4 text-on-surface/50">Partner With Us</p>
          <h1 className="heading mt-1 text-2xl md:text-3xl">Become a Sponsor</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Tell us about your brand — an admin reviews every sponsor application before it goes live.
          </p>
        </div>

        {existing ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3">
                Application status <RoleStatusBadge status={existing.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-on-surface/60">
              {existing.status === "pending" ? "Your sponsor application is waiting for admin review." : null}
              {existing.status === "approved" ? (
                <>
                  You&apos;re an approved sponsor.{" "}
                  <Link href="/account/sponsor/dashboard" className="text-primary hover:underline">
                    Go to your dashboard
                  </Link>
                  .
                </>
              ) : null}
              {existing.status === "rejected" ? "Your sponsor application was not approved." : null}
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8">
            <SponsorApplicationForm />
          </div>
        )}
      </div>
    </div>
  );
}
