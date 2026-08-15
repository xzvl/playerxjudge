import { FindCommunitySectionClient } from "@/components/communities/FindCommunitySectionClient";
import { getPublicCommunitiesWithLocation } from "@/lib/communities/public-profile";

// Server wrapper: fetches real approved communities with a pin dropped and
// hands them to the client component that owns the map — same pattern as
// FindTournamentSection.
export async function FindCommunitySection() {
  const communities = await getPublicCommunitiesWithLocation();
  return <FindCommunitySectionClient communities={communities} />;
}
