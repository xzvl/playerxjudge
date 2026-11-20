"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { approveLeagueMatch } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";

export function MatchApproveButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="erp:h-7 erp:px-2 erp:text-xs erp:text-emerald-500"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await approveLeagueMatch(matchId);
            if (result.status === "error") setError(result.message ?? "Couldn't approve.");
            else router.refresh();
          })
        }
      >
        <Check /> {pending ? "Approving…" : "Approve"}
      </Button>
      {error ? <span className="text-xs text-primary">{error}</span> : null}
    </>
  );
}
