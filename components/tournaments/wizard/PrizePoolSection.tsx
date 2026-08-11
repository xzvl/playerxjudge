"use client";

import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch, type FieldErrors } from "react-hook-form";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { buildPlacementOptions, type CreateTournamentInput } from "@/lib/validations/tournament-wizard";

// Manual path lookup instead of typed field access — namePrefix varies
// between the flat "prizePool" list and each "prizePool.rangeSections.N"
// section, and RHF's error object shape can't be dot-accessed generically
// once N is dynamic.
function getFieldError(errors: FieldErrors<CreateTournamentInput>, path: string): string | undefined {
  let cur: unknown = errors;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return (cur as { message?: string } | undefined)?.message;
}

// The reorderable placement/prize-name list — shared by the flat prize pool
// and by each participant-range section, since both are just "a list of
// prizes" underneath. Placement is hidden entirely when `snakeDrafted`:
// drafted prizes go in list order, not a fixed placement, so newly-added
// rows get an internal "Pick N" placement instead of a user-picked one, and
// the list isn't capped to the number of placement slots.
function PrizeListFields({
  namePrefix,
  cap,
  snakeDrafted,
  sameTierPrizes,
}: {
  namePrefix: "prizePool" | `prizePool.rangeSections.${number}`;
  cap: number;
  snakeDrafted: boolean;
  sameTierPrizes: boolean;
}) {
  const form = useFormContext<CreateTournamentInput>();
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: `${namePrefix}.prizes` });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const prizes = useWatch({ control: form.control, name: `${namePrefix}.prizes` }) ?? [];

  const allOptions = buildPlacementOptions(cap, sameTierPrizes);

  function onDrop(targetIndex: number) {
    if (dragIndex !== null && dragIndex !== targetIndex) move(dragIndex, targetIndex);
    setDragIndex(null);
  }

  return (
    <div className="space-y-2">
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const usedElsewhere = new Set(prizes.filter((_, i) => i !== index).map((p) => p.placement));
            const options = allOptions.filter((o) => o.value === prizes[index]?.placement || !usedElsewhere.has(o.value));
            const placementError = getFieldError(form.formState.errors, `${namePrefix}.prizes.${index}.placement`);
            const nameError = getFieldError(form.formState.errors, `${namePrefix}.prizes.${index}.prizeName`);

            return (
              <div
                key={field.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(index)}
                className="flex items-start gap-3 border border-outline-variant/25 bg-surface-container-low p-3"
              >
                <GripVertical className="mt-2.5 h-4 w-4 shrink-0 cursor-grab text-on-surface/30" aria-hidden="true" />
                {!snakeDrafted ? (
                  <div className="w-52 shrink-0 space-y-1">
                    <Controller
                      control={form.control}
                      name={`${namePrefix}.prizes.${index}.placement`}
                      render={({ field: placementField }) => (
                        <Combobox label="Placement" value={placementField.value} onValueChange={placementField.onChange} options={options} />
                      )}
                    />
                    {placementError ? <p className="text-xs text-destructive">{placementError}</p> : null}
                  </div>
                ) : null}
                <div className="flex-1 space-y-1">
                  <Controller
                    control={form.control}
                    name={`${namePrefix}.prizes.${index}.prizeName`}
                    render={({ field: nameField }) => <Input placeholder="Prize (e.g. ₱5,000 cash, Trophy)" {...nameField} />}
                  />
                  {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0"
                  onClick={() => remove(index)}
                  aria-label="Remove prize"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-center text-sm text-on-surface/50">
          No prizes added yet.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        tooltip={snakeDrafted ? "Add another drafted prize" : "Add another placement/prize row"}
        disabled={!snakeDrafted && fields.length >= allOptions.length}
        onClick={() => {
          if (snakeDrafted) {
            append({ placement: `Pick ${fields.length + 1}`, prizeName: "" });
            return;
          }
          const used = new Set(prizes.map((p) => p.placement));
          const next = allOptions.find((o) => !used.has(o.value));
          append({ placement: next?.value ?? "", prizeName: "" });
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add Prize
      </Button>
    </div>
  );
}

export function PrizePoolSection() {
  const form = useFormContext<CreateTournamentInput>();

  const stageType = useWatch({ control: form.control, name: "stageType" });
  const advancePerGroup = useWatch({ control: form.control, name: "groupStage.participantsAdvancePerGroup" });
  const sameTierPrizes = useWatch({ control: form.control, name: "prizePool.sameTierPrizes" });
  const snakeDrafted = useWatch({ control: form.control, name: "prizePool.snakeDrafted" });
  const useRanges = useWatch({ control: form.control, name: "prizePool.useParticipantRanges" });

  // Placements stop at however many players advance out of the group stage
  // — see buildPlacementOptions. Single-stage tournaments have no such
  // field, so only the fixed Champion/Runner-up/King-of-Swiss set applies.
  // Shared by the flat list and every range section — a section's own
  // participant range doesn't further narrow this.
  const cap = stageType === "two_stage" ? advancePerGroup : 4;

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control: form.control,
    name: "prizePool.rangeSections",
  });
  const sections = useWatch({ control: form.control, name: "prizePool.rangeSections" }) ?? [];
  const sectionsError = getFieldError(form.formState.errors, "prizePool.rangeSections");

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-3 text-sm text-on-surface">
        <Checkbox
          checked={useRanges}
          onChange={(e) => form.setValue("prizePool.useParticipantRanges", e.target.checked, { shouldValidate: true })}
        />
        Vary prizes by number of participants
      </label>

      {useRanges ? (
        <div className="space-y-6">
          {sectionFields.length > 0 ? (
            <div className="space-y-6">
              {sectionFields.map((field, index) => {
                const section = sections[index];
                const rangeEndError = getFieldError(form.formState.errors, `prizePool.rangeSections.${index}.rangeEnd`);
                const rangeStartError = getFieldError(form.formState.errors, `prizePool.rangeSections.${index}.rangeStart`);

                return (
                  <div key={field.id} className="space-y-4 border border-outline-variant/25 bg-surface-container-low p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="label-mono text-on-surface/60">Section {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove Section ${index + 1}`}
                        onClick={() => removeSection(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-on-surface/60">From</span>
                        <Controller
                          control={form.control}
                          name={`prizePool.rangeSections.${index}.rangeStart`}
                          render={({ field: f }) => (
                            <Input
                              type="number"
                              min="1"
                              className="w-24"
                              {...f}
                              onChange={(e) => f.onChange(e.target.valueAsNumber)}
                            />
                          )}
                        />
                        <span className="text-sm text-on-surface/60">to</span>
                        <Controller
                          control={form.control}
                          name={`prizePool.rangeSections.${index}.rangeEnd`}
                          render={({ field: f }) => (
                            <Input
                              type="number"
                              min="1"
                              className="w-24"
                              {...f}
                              onChange={(e) => f.onChange(e.target.valueAsNumber)}
                            />
                          )}
                        />
                        <span className="text-sm text-on-surface/60">participants</span>
                      </div>
                      {rangeStartError ? <p className="text-xs text-destructive">{rangeStartError}</p> : null}
                      {rangeEndError ? <p className="text-xs text-destructive">{rangeEndError}</p> : null}
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 text-sm text-on-surface">
                        <Checkbox
                          checked={section?.snakeDrafted ?? false}
                          onChange={(e) =>
                            form.setValue(`prizePool.rangeSections.${index}.snakeDrafted`, e.target.checked)
                          }
                        />
                        Snake drafted
                      </label>
                      <label className="flex items-center gap-3 text-sm text-on-surface">
                        <Checkbox
                          checked={section?.sameTierPrizes ?? false}
                          onChange={(e) =>
                            form.setValue(`prizePool.rangeSections.${index}.sameTierPrizes`, e.target.checked)
                          }
                        />
                        Same prizes for 8th, 16th, 32nd...
                      </label>
                    </div>

                    <PrizeListFields
                      namePrefix={`prizePool.rangeSections.${index}`}
                      cap={cap}
                      snakeDrafted={section?.snakeDrafted ?? false}
                      sameTierPrizes={section?.sameTierPrizes ?? false}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="border border-outline-variant/25 bg-surface-container-low p-6 text-center text-sm text-on-surface/50">
              No participant ranges added yet.
            </p>
          )}
          {sectionsError ? <p className="text-xs text-destructive">{sectionsError}</p> : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            tooltip="Add another participant-count range with its own prizes"
            onClick={() => {
              const last = sections[sections.length - 1];
              const rangeStart = last ? last.rangeEnd + 1 : 1;
              appendSection({ rangeStart, rangeEnd: rangeStart, snakeDrafted: false, sameTierPrizes: false, prizes: [] });
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Section
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-on-surface">
              <Checkbox checked={snakeDrafted} onChange={(e) => form.setValue("prizePool.snakeDrafted", e.target.checked)} />
              Snake drafted
            </label>
            <label className="flex items-center gap-3 text-sm text-on-surface">
              <Checkbox
                checked={sameTierPrizes}
                onChange={(e) => form.setValue("prizePool.sameTierPrizes", e.target.checked)}
              />
              Same prizes for 8th, 16th, 32nd...
            </label>
          </div>

          <PrizeListFields namePrefix="prizePool" cap={cap} snakeDrafted={snakeDrafted} sameTierPrizes={sameTierPrizes} />
        </div>
      )}
    </div>
  );
}
