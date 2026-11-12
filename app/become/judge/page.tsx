import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gavel } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JudgeApplicationForm } from "@/components/become/JudgeApplicationForm";
import { RoleStatusBadge } from "@/components/roles/RoleStatusBadge";
import { getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Become a Judge",
  description: "Apply to officiate Beyblade X community tournaments as a judge.",
};

export default async function BecomeJudgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/become/judge");

  const roles = await getCurrentUserRoles();
  const existing = roles.find((r) => r.role === "judge");

  return (
    <div className="px-4 py-12 md:px-6">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
            <Gavel className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
          </div>
          <p className="label-mono mt-4 text-on-surface/50">Officiate</p>
          <h1 className="heading mt-1 text-2xl md:text-3xl">Become a Judge</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Help officiate community tournaments — an admin reviews every judge request.
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
              {existing.status === "pending" ? "Your judge request is waiting for admin review." : null}
              {existing.status === "approved" ? (
                <>
                  You&apos;re an approved judge.{" "}
                  <Link href="/account/judge/dashboard" className="text-primary hover:underline">
                    Go to your dashboard
                  </Link>
                  .
                </>
              ) : null}
              {existing.status === "rejected" ? "Your judge request was not approved." : null}
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8">
            <JudgeApplicationForm />
          </div>
        )}
      </div>
    </div>
  );
}
