import { Badge, type BadgeProps } from "@/components/ui/badge";
import { sponsorListingStatus, type SponsorListingStatus } from "@/lib/sponsors/status";
import type { Sponsor, SponsorApprovalStatus } from "@/lib/types/database";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

// The listing's derived active/inactive badge — see sponsorListingStatus's
// doc comment for why this isn't a stored column.
const SPONSOR_STATUS_VARIANTS: Record<SponsorListingStatus, BadgeProps["variant"]> = {
  active: "success",
  inactive: "outline",
};

export function SponsorStatusBadge({ sponsor }: { sponsor: Pick<Sponsor, "approval_status" | "tier_expires_at"> }) {
  const status = sponsorListingStatus(sponsor);
  return <Badge variant={SPONSOR_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}

// Admin-only gate (flipped via Supabase Studio for now, see the migration's
// comment) — display-only everywhere in the app, same as
// CommunityApprovalStatusBadge.
const SPONSOR_APPROVAL_STATUS_VARIANTS: Record<SponsorApprovalStatus, BadgeProps["variant"]> = {
  pending: "outline",
  approved: "success",
  declined: "destructive",
};

export function SponsorApprovalStatusBadge({ status }: { status: SponsorApprovalStatus }) {
  return <Badge variant={SPONSOR_APPROVAL_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}
