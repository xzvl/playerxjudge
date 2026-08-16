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
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <Handshake className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Partner With Us</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Become a Sponsor</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Tell us about your brand — an admin reviews every sponsor application before it goes live.
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
          <div className="mt-12">
            <SponsorApplicationForm />
          </div>
        )}
      </div>
    </div>
  );
}
