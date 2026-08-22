"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RichTextEditor } from "@/components/tournaments/wizard/RichTextEditor";
import {
  BATTLE_TYPE_OPTIONS,
  TOURNAMENT_TIER_OPTIONS,
  type CreateTournamentInput,
} from "@/lib/validations/tournament-wizard";
import { checkSlugAvailable } from "@/app/account/organizer/tournament/shared-actions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NO_COMMUNITY = "";

export function BasicInfoSection({
  communities,
  excludeTournamentId,
  editable,
  lockSlug = false,
}: {
  communities: { id: string; name: string }[];
  excludeTournamentId?: string;
  editable: boolean;
  // The slug stays locked once the group stage has started, independent of
  // `editable` — everything else in this section keeps following `editable`
  // via the ambient <fieldset> the caller wraps this in.
  lockSlug?: boolean;
}) {
  const form = useFormContext<CreateTournamentInput>();
  const slugTouched = useRef(false);
  const slug = useWatch({ control: form.control, name: "slug" });
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (!editable || lockSlug || !slug || slug.length < 3 || form.formState.errors.slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      const result = await checkSlugAvailable(slug, excludeTournamentId);
      setSlugStatus(result.available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, editable, lockSlug, excludeTournamentId]);

  const hostOptions: ComboboxOption[] = [
    { value: NO_COMMUNITY, label: "Independent — No Community" },
    ...communities.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-bold text-on-surface">Host</p>
        <Combobox
          label="Host"
          value={form.watch("hostCommunityId") ?? NO_COMMUNITY}
          onValueChange={(v) => form.setValue("hostCommunityId", v === NO_COMMUNITY ? null : v)}
          options={hostOptions}
        />
      </div>

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tournament Name</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  if (!slugTouched.current) {
                    form.setValue("slug", slugify(e.target.value), { shouldValidate: true });
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <fieldset disabled={lockSlug} className="m-0 min-w-0 space-y-2 border-0 p-0">
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-on-surface/40">/tournaments/</span>
                  <Input
                    {...field}
                    onChange={(e) => {
                      slugTouched.current = true;
                      field.onChange(slugify(e.target.value));
                    }}
                  />
                </div>
              </FormControl>
              {lockSlug ? (
                <p className="text-xs text-on-surface/40">The URL can&apos;t change once the group stage has started.</p>
              ) : null}
              {slugStatus === "checking" ? <p className="text-xs text-on-surface/40">Checking availability...</p> : null}
              {slugStatus === "available" ? <p className="text-xs text-primary">Available.</p> : null}
              {slugStatus === "taken" ? <p className="text-xs text-destructive">Already taken — try another.</p> : null}
              <FormMessage />
            </FormItem>
          )}
        />
      </fieldset>

      <FormField
        control={form.control}
        name="shortDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Short Description</FormLabel>
            <FormControl>
              <Input placeholder="One line shown on tournament cards and listings" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              {/* Always editable, even once the rest of this section is
                  locked (Settings keeps Description open at any stage) —
                  Tiptap ignores ambient `<fieldset disabled>`, so this has
                  to opt out explicitly rather than inherit `editable`. */}
              <RichTextEditor value={field.value} onChange={field.onChange} editable />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-bold text-on-surface">Participant Type</p>
          <Combobox
            label="Participant Type"
            value={form.watch("battleType")}
            onValueChange={(v) => form.setValue("battleType", v as CreateTournamentInput["battleType"], { shouldValidate: true })}
            options={BATTLE_TYPE_OPTIONS}
          />
          <p className="text-xs text-on-surface/40">2v2, 3v3, 4v4, 5v5, and Team Battle are coming soon.</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-on-surface">Tournament Tier</p>
          <Combobox
            label="Tournament Tier"
            value={form.watch("tournamentType")}
            onValueChange={(v) => form.setValue("tournamentType", v as CreateTournamentInput["tournamentType"], { shouldValidate: true })}
            options={TOURNAMENT_TIER_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
