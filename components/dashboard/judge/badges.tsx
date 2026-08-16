import { BadgeCheck } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { BeyzIdStatus } from "@/lib/types/database";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

// A judge is only "Certified" once an admin has approved their BeyZ ID
// (see 20250101000035_judge_beyz_id.sql) — everyone else, including a
// judge who's never submitted one, is just a regular judge.
export function CertifiedJudgeBadge({ certified }: { certified: boolean }) {
  if (!certified) return <Badge variant="outline">Regular Judge</Badge>;
  return (
    <Badge variant="success" className="gap-1">
      <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Certified Judge
    </Badge>
  );
}

const BEYZ_ID_STATUS_VARIANTS: Record<BeyzIdStatus, BadgeProps["variant"]> = {
  pending: "outline",
  approved: "success",
  declined: "destructive",
};

export function BeyzIdStatusBadge({ status }: { status: BeyzIdStatus | null }) {
  if (!status) return <Badge variant="outline">Not submitted</Badge>;
  return <Badge variant={BEYZ_ID_STATUS_VARIANTS[status]}>{statusLabel(status)}</Badge>;
}
