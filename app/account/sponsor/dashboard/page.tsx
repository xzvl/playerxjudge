import type { Metadata } from "next";
import { Image as ImageIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorProfileForm } from "@/components/become/SponsorProfileForm";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { updateSponsorProfile } from "@/app/account/sponsor/dashboard/actions";
import type { Sponsor } from "@/lib/types/database";

export const metadata: Metadata = { title: "Sponsor Dashboard", robots: { index: false, follow: false } };

const OTHER_FEATURES = [
  "Campaign Analytics",
  "Communities Sponsored",
  "Tournament Sponsorships",
  "Clicks",
  "Views",
  "CTR",
  "Invoices",
];

export default async function SponsorDashboardPage() {
  let sponsorRow: Sponsor | null = null;

  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    const supabase = await createClient();

    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("*")
      .eq("profile_id", user?.id ?? "")
      .single();

    sponsorRow = sponsor as Sponsor | null;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="heading text-2xl">Sponsor Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-on-surface/60">
          Track the performance of your sponsorships across communities and tournaments.
        </p>
      </div>

      <section>
        <h2 className="label-mono mb-4 flex items-center gap-2 text-primary">
          <ImageIcon className="h-4 w-4" aria-hidden="true" /> Sponsor Profile
        </h2>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Company &amp; Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <SponsorProfileForm
              action={updateSponsorProfile}
              submitLabel="Save Changes"
              defaultValues={{
                companyName: sponsorRow?.company_name ?? "",
                websiteUrl: sponsorRow?.website_url ?? "",
                logoUrl: sponsorRow?.logo_url ?? "",
              }}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="label-mono mb-4 text-on-surface/40">More Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OTHER_FEATURES.map((feature) => (
            <Card key={feature}>
              <CardHeader>
                <CardTitle className="text-base">{feature}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-on-surface/50">Coming in the next build phase.</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
