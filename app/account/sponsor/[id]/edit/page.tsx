import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SponsorListingForm } from "@/components/dashboard/sponsor/SponsorListingForm";
import { updateSponsorListing } from "@/app/account/sponsor/[id]/edit/actions";
import { getCurrentUser } from "@/lib/supabase/get-user";
import { createClient } from "@/lib/supabase/server";
import type { Sponsor } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard/erp";

export const metadata: Metadata = {
  title: "Edit Sponsor Listing",
  robots: { index: false, follow: false },
};

export default async function EditSponsorListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/account/sponsor/${id}/edit`);

  const supabase = await createClient();
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("*")
    .eq("id", id)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!sponsor) notFound();
  const row = sponsor as Sponsor;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Sponsor"
        title="Edit Sponsor Listing"
        description={<>Update this listing&apos;s branding, socials, and donation tier.</>}
      />
      <div className="mt-10">
        <SponsorListingForm
          sponsorId={row.id}
          action={updateSponsorListing.bind(null, row.id)}
          submitLabel="Save Changes"
          initialLogoUrl={row.logo_url}
          initialLightLogoUrl={row.logo_light_url}
          defaultValues={{
            sponsorName: row.company_name,
            websiteUrl: row.website_url ?? "",
            facebookUrl: row.facebook_url ?? "",
            donationTier: row.donation_tier ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
