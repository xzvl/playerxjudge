import type { Metadata } from "next";

import { FindCommunitySection } from "@/components/communities/FindCommunitySection";
import { CommunityListingsPanel } from "@/components/communities/CommunityListingsPanel";
import { getPublicApprovedCommunities } from "@/lib/communities/public-profile";

export const metadata: Metadata = {
  title: "Communities",
  description: "Discover Beyblade X communities near you, their members, events, and sponsors.",
};

export default async function CommunitiesPage() {
  const communities = await getPublicApprovedCommunities();

  return (
    <div>
      <FindCommunitySection />

      <section className="mx-auto max-w-[1280px] px-4 pb-16 md:px-6">
        <div className="mb-8">
          <p className="label-mono text-primary">Directory</p>
          <h2 className="heading mt-1 text-2xl md:text-3xl">All Communities</h2>
          <p className="mt-3 max-w-xl text-sm text-on-surface/60">Every approved community, from casual meetups to major-tournament hosts.</p>
        </div>
        <CommunityListingsPanel communities={communities} />
      </section>
    </div>
  );
}
