import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import { CommunitySettingsForm } from "@/components/dashboard/organizer/CommunitySettingsForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getManagedCommunity } from "@/app/account/organizer/community/[slug]/data";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = { title: "Community Settings", robots: { index: false, follow: false } };

export default async function CommunitySettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/community/${slug}/settings`);

  const community = await getManagedCommunity(user.id, slug);
  // Editing is owner-only (see updateCommunity/deleteCommunity) — a staff
  // `organizers` row can view Members but not the community's own settings.
  if (community.owner_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Community Management"
        title={<>{community.name} — Settings</>}
        description={<>Update your community&apos;s branding, headquarters, and social links.</>}
      />
      <div className="mt-10">
        <CommunitySettingsForm community={community} />
      </div>
    </div>
  );
}
