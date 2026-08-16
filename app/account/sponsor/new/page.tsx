import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SponsorListingForm } from "@/components/dashboard/sponsor/SponsorListingForm";
import { createSponsorListing } from "@/app/account/sponsor/new/actions";
import { getCurrentUser } from "@/lib/supabase/get-user";

export const metadata: Metadata = {
  title: "New Sponsor Listing",
  robots: { index: false, follow: false },
};

export default async function NewSponsorListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/account/sponsor/new");

  return (
    <div className="mx-auto max-w-3xl">
      <p className="label-mono text-primary">Sponsor</p>
      <h1 className="heading mt-2 text-3xl">New Sponsor Listing</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">
        Set up a sponsor listing&apos;s branding, socials, and donation tier.
      </p>
      <div className="mt-10">
        <SponsorListingForm sponsorId={null} action={createSponsorListing} submitLabel="Submit Listing" />
      </div>
    </div>
  );
}
