"use client";

import { useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import { useRouter } from "next/navigation";

import { createLeague, updateLeague } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormStatus } from "@/components/dashboard/team/FormField";

type Errors = Record<string, string[] | undefined>;

export function LeagueForm({
  teamId,
  teamSlug,
  league,
  onSaved,
}: {
  teamId: string;
  teamSlug: string;
  // Omit to create a new league.
  league?: { id: string; name: string; start_date: string; end_date: string; elite_count: number };
  onSaved?: () => void;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState(league?.name ?? "");
  const [startDate, setStartDate] = useState(league?.start_date ?? today);
  const [endDate, setEndDate] = useState(league?.end_date ?? "");
  const [eliteCount, setEliteCount] = useState(String(league?.elite_count ?? 3));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ status: "success" | "error"; message?: string } | null>(null);
  const [pending, startTransition] = useBusyTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const input = { name, startDate, endDate, eliteCount: Number(eliteCount) };
      const result = league ? await updateLeague(league.id, input) : await createLeague(teamId, input);
      setErrors(result.fieldErrors ?? {});
      if (result.status === "error") {
        setStatus({ status: "error", message: result.message });
        return;
      }
      if (!league && result.id) {
        router.push(`/account/team/teams/${teamSlug}/leagues/${result.id}`);
        return;
      }
      setStatus({ status: "success", message: "Saved." });
      router.refresh();
      onSaved?.();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="League name" htmlFor="league-name" error={errors.name?.[0]}>
        <Input id="league-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Metro League · Season 3" required />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Start date" htmlFor="league-start" error={errors.startDate?.[0]}>
          <Input id="league-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </FormField>
        <FormField label="End date" htmlFor="league-end" error={errors.endDate?.[0]}>
          <Input id="league-end" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
        </FormField>
      </div>

      <FormField
        label="Elite players"
        htmlFor="league-elite"
        error={errors.eliteCount?.[0]}
        hint="How many main players the team fields. Everyone else on the roster is a sub."
        className="max-w-[12rem]"
      >
        <Input
          id="league-elite"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          value={eliteCount}
          onChange={(e) => setEliteCount(e.target.value)}
          required
        />
      </FormField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : league ? "Save league" : "Create league"}
        </Button>
        <FormStatus status={status?.status ?? null} message={status?.message} />
      </div>
    </form>
  );
}
