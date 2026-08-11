import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { TournamentStatus } from "@/lib/types/database";
import type { ReportStatus, RegistrationStatus } from "@/lib/mock/organizer-dashboard";

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

const REPORT_STATUS_VARIANTS: Record<ReportStatus, BadgeProps["variant"]> = {
  open: "destructive",
  resolved: "success",
  dismissed: "outline",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge variant={REPORT_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}
