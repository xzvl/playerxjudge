import type { Sponsor, SponsorDonationTier } from "@/lib/types/database";

// Display metadata + duration for each donation tier — shown on the tier
// picker (SponsorListingForm) and used to compute a listing's renewal
// expiry date once an admin approves it.
export const DONATION_TIERS: { value: SponsorDonationTier; price: string; duration: string; days: number }[] = [
  { value: "1_month", price: "₱100", duration: "1 Month", days: 30 },
  { value: "6_months", price: "₱500", duration: "6 Months", days: 182 },
  { value: "1_year", price: "₱1,000", duration: "1 Year", days: 365 },
];

export function tierDurationDays(tier: SponsorDonationTier): number {
  return DONATION_TIERS.find((t) => t.value === tier)?.days ?? 30;
}

export function tierLabel(tier: SponsorDonationTier | null): string {
  if (!tier) return "No tier selected";
  return DONATION_TIERS.find((t) => t.value === tier)?.duration ?? tier;
}

// A listing's visible status is entirely derived, not stored (see the
// migration's comment) — "active" only once an admin has approved it *and*
// its tier hasn't lapsed yet.
export type SponsorListingStatus = "active" | "inactive";

export function sponsorListingStatus(sponsor: Pick<Sponsor, "approval_status" | "tier_expires_at">): SponsorListingStatus {
  if (sponsor.approval_status !== "approved") return "inactive";
  if (!sponsor.tier_expires_at) return "inactive";
  return new Date(sponsor.tier_expires_at).getTime() >= Date.now() ? "active" : "inactive";
}
