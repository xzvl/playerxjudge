import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CommunityMembersPanel, type CommunityMemberRow } from "@/components/dashboard/organizer/CommunityMembersPanel";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { getManagedCommunity } from "@/app/account/organizer/community/[slug]/data";
import type { ProfileCommunityStatus } from "@/lib/types/database";

export const metadata: Metadata = { title: "Members", robots: { index: false, follow: false } };

interface MemberRow {
  id: string;
  profile_id: string;
  status: ProfileCommunityStatus;
  created_at: string;
  profiles: { display_name: string; first_name: string | null; last_name: string | null } | null;
}

export default async function CommunityMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/organizer/community/${slug}/members`);

  const community = await getManagedCommunity(user.id, slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_communities")
    .select("id, profile_id, status, created_at, profiles(display_name, first_name, last_name)")
    .eq("community_id", community.id)
    .order("created_at", { ascending: false });

  const members: CommunityMemberRow[] = ((data as unknown as MemberRow[] | null) ?? []).map((m) => ({
    id: m.id,
    playerName: m.profiles?.display_name ?? "Unknown",
    fullName: [m.profiles?.first_name, m.profiles?.last_name].filter(Boolean).join(" ") || "—",
    status: m.status,
    registeredAt: m.created_at,
  }));

  return (
    <div>
      <p className="label-mono text-primary">Community Management</p>
      <h2 className="heading mt-2 text-2xl">{community.name} — Members</h2>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Everyone who&apos;s joined or requested to join this community.</p>
      <div className="mt-8">
        <CommunityMembersPanel slug={slug} members={members} />
      </div>
    </div>
  );
}
