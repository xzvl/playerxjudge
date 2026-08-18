import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JudgeApplyForm } from "@/components/dashboard/judge/JudgeApplyForm";
import { RoleStatusBadge } from "@/components/roles/RoleStatusBadge";
import { getCurrentProfile, getCurrentUser, getCurrentUserRoles } from "@/lib/supabase/get-user";

export const metadata: Metadata = { title: "Apply Judge", robots: { index: false, follow: false } };

export default async function JudgeApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/apply");

  const roles = await getCurrentUserRoles();
  const existing = roles.find((r) => r.role === "judge");
  // Already an approved judge — nothing to apply for, and this route's
  // sidebar entry is hidden for them anyway (see accountNavItems.tsx); a
  // stale link/bookmark just lands them on their real dashboard instead.
  if (existing?.status === "approved") redirect("/account/judge/dashboard");

  const profile = await getCurrentProfile();

  return (
    <div>
      <p className="label-mono text-primary">Account</p>
      <h1 className="heading mt-2 text-3xl">Apply Judge</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Help officiate community tournaments — an admin reviews every judge request.
      </p>

      {existing ? (
        <Card className="mt-8 max-w-xl">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3">
              Application status <RoleStatusBadge status={existing.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-on-surface/60">
            {existing.status === "pending" ? "Your judge request is waiting for admin review." : null}
            {existing.status === "rejected" ? (
              <>
                Your judge request was not approved.{" "}
                <Link href="/account/judge/apply" className="text-primary hover:underline">
                  Reach out to an admin
                </Link>{" "}
                if you&apos;d like to be reconsidered.
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">BeyZ ID Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <JudgeApplyForm initialBeyzIdUrl={profile?.beyz_id_url ?? null} initialBeyzIdStatus={profile?.beyz_id_status ?? null} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
