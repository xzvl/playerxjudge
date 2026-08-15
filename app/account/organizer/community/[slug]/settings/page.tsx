import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import { CommunitySettingsForm } from "@/components/dashboard/organizer/CommunitySettingsForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { getManagedCommunity } from "@/app/account/organizer/community/[slug]/data";

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
      <p className="label-mono text-primary">Community Management</p>
      <h1 className="heading mt-2 text-3xl">{community.name} — Settings</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Update your community&apos;s branding, headquarters, and social links.</p>
      <div className="mt-10">
        <CommunitySettingsForm community={community} />
      </div>
    </div>
  );
}
