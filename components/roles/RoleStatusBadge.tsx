import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { RoleStatus } from "@/lib/types/database";

const LABELS: Record<RoleStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

const VARIANTS: Record<RoleStatus, BadgeProps["variant"]> = {
  pending: "outline",
  approved: "success",
  rejected: "destructive",
};

export function RoleStatusBadge({ status }: { status: RoleStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
