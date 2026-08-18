import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CertifiedJudgeBadge } from "@/components/dashboard/judge/badges";
import { JudgeBeyzIdUploader } from "@/components/dashboard/judge/JudgeBeyzIdUploader";
import { getCurrentProfile, getCurrentUser } from "@/lib/supabase/get-user";

export const metadata: Metadata = { title: "Judge Profile", robots: { index: false, follow: false } };

export default async function JudgeProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/judge/profile");

  const profile = await getCurrentProfile();
  const certified = profile?.beyz_id_status === "approved";

  return (
    <div>
      <p className="label-mono text-primary">Judge Dashboard</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="heading text-3xl">Judge Profile</h1>
        <CertifiedJudgeBadge certified={certified} />
      </div>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Upload your BeyZ ID to become eligible for the Certified Judge tag.
      </p>

      <Card className="mt-8 max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">BeyZ ID Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <JudgeBeyzIdUploader initialUrl={profile?.beyz_id_url ?? null} initialStatus={profile?.beyz_id_status ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
