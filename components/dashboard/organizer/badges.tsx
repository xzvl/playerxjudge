import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { CommunityApprovalStatus, CommunityStatus, JudgeAssignmentStatus, TournamentReportStatus, TournamentStatus } from "@/lib/types/database";
import type { RegistrationStatus } from "@/lib/mock/organizer-dashboard";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

const TOURNAMENT_STATUS_VARIANTS: Record<TournamentStatus, BadgeProps["variant"]> = {
  draft: "outline",
  published: "secondary",
  registration_open: "success",
  registration_closed: "casual",
  ongoing: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  return <Badge variant={TOURNAMENT_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}

const REGISTRATION_STATUS_VARIANTS: Record<RegistrationStatus, BadgeProps["variant"]> = {
  pending: "outline",
  confirmed: "secondary",
  checked_in: "success",
  cancelled: "destructive",
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Badge variant={REGISTRATION_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}

// pending = invited, not yet confirmed by the judge; removed rows are
// deleted outright (see removeJudge) rather than ever rendered this way.
const JUDGE_ASSIGNMENT_STATUS_VARIANTS: Record<JudgeAssignmentStatus, BadgeProps["variant"]> = {
  pending: "outline",
  approved: "success",
  removed: "destructive",
};

const JUDGE_ASSIGNMENT_STATUS_LABEL: Record<JudgeAssignmentStatus, string> = {
  pending: "Pending",
  approved: "Confirmed",
  removed: "Removed",
};

export function JudgeAssignmentStatusBadge({ status }: { status: JudgeAssignmentStatus }) {
  return <Badge variant={JUDGE_ASSIGNMENT_STATUS_VARIANTS[status]}>{JUDGE_ASSIGNMENT_STATUS_LABEL[status]}</Badge>;
}

const REPORT_STATUS_VARIANTS: Record<TournamentReportStatus, BadgeProps["variant"]> = {
  open: "destructive",
  resolved: "success",
  dismissed: "outline",
};

export function ReportStatusBadge({ status }: { status: TournamentReportStatus }) {
  return <Badge variant={REPORT_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}

// The organizer's own operational toggle (Settings -> Status) — not to be
// confused with CommunityApprovalStatusBadge below, which is the separate
// admin-only pending/approved gate.
const COMMUNITY_STATUS_VARIANTS: Record<CommunityStatus, BadgeProps["variant"]> = {
  active: "success",
  inactive: "outline",
};

export function CommunityStatusBadge({ status }: { status: CommunityStatus }) {
  return <Badge variant={COMMUNITY_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}

// Mirrors supabase/migrations/20250101000033_community_status_fields.sql —
// only an admin can flip this (see app/backend/communities); it's
// display-only everywhere else.
const COMMUNITY_APPROVAL_STATUS_VARIANTS: Record<CommunityApprovalStatus, BadgeProps["variant"]> = {
  pending: "outline",
  approved: "success",
};

export function CommunityApprovalStatusBadge({ status }: { status: CommunityApprovalStatus }) {
  return <Badge variant={COMMUNITY_APPROVAL_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}
