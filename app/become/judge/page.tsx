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
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <Gavel className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Officiate</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Become a Judge</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Help officiate community tournaments — an admin reviews every judge request.
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
          <div className="mt-12">
            <JudgeApplicationForm />
          </div>
        )}
      </div>
    </div>
  );
}
