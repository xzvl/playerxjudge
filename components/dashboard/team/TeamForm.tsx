"use client";

import { useState } from "react";
import { useBusyTransition } from "@/components/dashboard/DashboardBusy";
import { useRouter } from "next/navigation";

import { createTeam, updateTeam } from "@/app/account/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormStatus } from "@/components/dashboard/team/FormField";
import { slugify } from "@/lib/validations/team";

type Errors = Record<string, string[] | undefined>;

export function TeamForm({
  team,
}: {
  // Omit to create a new team.
  team?: { id: string; name: string; slug: string; tag: string | null; description: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(team?.name ?? "");
  const [slug, setSlug] = useState(team?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!team);
  const [tag, setTag] = useState(team?.tag ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<{ status: "success" | "error"; message?: string } | null>(null);
  const [pending, startTransition] = useBusyTransition();

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const input = { name, slug, tag, description };
      const result = team ? await updateTeam(team.id, input) : await createTeam(input);
      setErrors(result.fieldErrors ?? {});
      if (result.status === "error") {
        setStatus({ status: "error", message: result.message });
        return;
      }
      if (!team) {
        router.push(`/account/team/teams/${result.slug}`);
        return;
      }
      setStatus({ status: "success", message: "Saved." });
      if (result.slug && result.slug !== team.slug) router.replace(`/account/team/teams/${result.slug}/settings`);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <FormField label="Team name" htmlFor="team-name" error={errors.name?.[0]}>
          <Input id="team-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Team Vortex" required />
        </FormField>
        <FormField label="Tag" htmlFor="team-tag" error={errors.tag?.[0]} hint="Up to 6 letters">
          <Input
            id="team-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            placeholder="VTX"
            maxLength={6}
            className="font-mono uppercase"
          />
        </FormField>
      </div>

      <FormField
        label="Public URL"
        htmlFor="team-slug"
        error={errors.slug?.[0]}
        hint={
          <>
            Your team&apos;s public page: <span className="font-mono text-on-surface/70">/teams/{slug || "your-team"}</span>
          </>
        }
      >
        <div className="flex items-center">
          <span className="flex h-8 items-center rounded-l-md border border-r-0 border-outline-variant/35 bg-surface-container px-2.5 font-mono text-xs text-on-surface/50">
            /teams/
          </span>
          <Input
            id="team-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            className="rounded-l-none font-mono erp:rounded-l-none"
            required
          />
        </div>
      </FormField>

      <FormField label="Description" htmlFor="team-description" error={errors.description?.[0]} hint="Optional · shown on the public page">
        <Textarea
          id="team-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Who you are, where you play."
        />
      </FormField>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : team ? "Save changes" : "Create team"}
        </Button>
        <FormStatus status={status?.status ?? null} message={status?.message} />
      </div>
    </form>
  );
}
