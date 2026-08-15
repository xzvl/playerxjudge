import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCommunityWizard } from "@/components/dashboard/organizer/CreateCommunityWizard";
import { getCurrentUser } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Create Community",
  robots: { index: false, follow: false },
};

export default async function NewCommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/community/new");

  return (
    <div className="mx-auto max-w-3xl">
      <p className="label-mono text-primary">Organizer</p>
      <h1 className="heading mt-2 text-3xl">Create Community</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Set up your community&apos;s branding, headquarters, and social links.
      </p>
      <div className="mt-10">
        <CreateCommunityWizard />
      </div>
    </div>
  );
}
