import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImageIcon, KeyRound, Trophy, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalInfoForm } from "@/components/account/PersonalInfoForm";
import { TournamentInfoForm } from "@/components/account/TournamentInfoForm";
import { PhotoUploadForm } from "@/components/account/PhotoUploadForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { getCurrentUser, getCurrentProfile } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ProfileCommunity } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/settings");

  const profile = await getCurrentProfile();

  let communities: { id: string; name: string }[] = [];
  let profileCommunityIds: string[] = [];

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [{ data: communitiesData }, { data: profileCommunitiesData }] = await Promise.all([
      supabase.from("communities").select("id, name").order("name"),
      supabase.from("profile_communities").select("*").eq("profile_id", user.id),
    ]);
    communities = communitiesData ?? [];
    profileCommunityIds = ((profileCommunitiesData as ProfileCommunity[] | null) ?? []).map(
      (pc) => pc.community_id
    );
  }

  const socialLinks = profile?.social_links ?? {};

  return (
    <div className="space-y-8">
      <div>
        <p className="label-mono text-primary">Account</p>
        <h1 className="heading mt-2 text-3xl">Account Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" aria-hidden="true" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalInfoForm
            defaultValues={{
              displayName: profile?.display_name ?? "",
              firstName: profile?.first_name ?? "",
              lastName: profile?.last_name ?? "",
              facebookName: socialLinks.facebook_name ?? "",
              facebookUrl: socialLinks.facebook_url ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" aria-hidden="true" /> Tournament Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TournamentInfoForm
            communities={communities.map((c) => ({ value: c.id, label: c.name }))}
            defaultBladerNames={profile?.blader_names ?? []}
            defaultCommunityIds={profileCommunityIds}
            defaultMainCommunityId={profile?.community_id ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" aria-hidden="true" /> Photo Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-on-surface/60">
            JPG or PNG, 250KB max. Every photo is converted to WebP automatically.
          </p>
          <PhotoUploadForm
            mainPhotoUrl={profile?.main_photo_url ?? null}
            fullBodyPhotoUrl={profile?.full_body_photo_url ?? null}
            halfBodyPhotoUrl={profile?.half_body_photo_url ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
