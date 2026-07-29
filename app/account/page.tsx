import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { getCurrentUser } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account");

  return (
    <PagePlaceholder
      eyebrow="Profile"
      title="Account Settings"
      description="Avatar, display name, country/province/city, community, favorite Beyblade, bio, and social links editing is coming in the next build phase."
      Icon={Settings}
    />
  );
}
