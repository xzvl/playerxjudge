import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateCommunityWizard } from "@/components/dashboard/organizer/CreateCommunityWizard";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = {
  title: "Create Community",
  robots: { index: false, follow: false },
};

export default async function NewCommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/organizer/community/new");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Organizer"
        title="Create Community"
        description={<>Set up your community&apos;s branding, headquarters, and social links.</>}
      />
      <div className="mt-10">
        <CreateCommunityWizard />
      </div>
    </div>
  );
}
