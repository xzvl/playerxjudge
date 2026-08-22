"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  GRAND_FINALS_OPTIONS,
  PLAY_COUNT_OPTIONS,
  RANK_BY_OPTIONS,
  stageFormatOptionsFor,
  type CreateTournamentInput,
} from "@/lib/validations/tournament-wizard";

type StagePrefix = "groupStage" | "finalStage";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold text-on-surface">{children}</p>;
}

function StageFormatSelect({
  name,
  label,
  stage,
}: {
  name: "singleStageFormat" | "groupStage.format" | "finalStage.format";
  label: string;
  stage: "single" | "group" | "final";
}) {
  const form = useFormContext<CreateTournamentInput>();
  const value = useWatch({ control: form.control, name });

  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Combobox
        label="Format"
        value={value}
        onValueChange={(v) => form.setValue(name, v as CreateTournamentInput["finalStage"]["format"], { shouldValidate: true })}
        options={stageFormatOptionsFor(stage)}
      />
      <p className="text-xs text-on-surface/40">
        {stage === "final" ? "Swiss, Double Elimination, and Round Robin are" : "Double Elimination and Round Robin are"} coming
        soon.
      </p>
    </div>
  );
}

function RoundRobinPlayCountField({ prefix }: { prefix: StagePrefix }) {
  const form = useFormContext<CreateTournamentInput>();
  const value = useWatch({ control: form.control, name: `${prefix}.roundRobinPlayCount` });

  return (
    <Combobox
      label="Participants Play Each Other"
      value={String(value)}
      onValueChange={(v) => form.setValue(`${prefix}.roundRobinPlayCount`, Number(v) as 1 | 2 | 3, { shouldValidate: true })}
      options={PLAY_COUNT_OPTIONS}
    />
  );
}

function RankByField({ prefix }: { prefix: StagePrefix }) {
  const form = useFormContext<CreateTournamentInput>();
  const value = useWatch({ control: form.control, name: `${prefix}.roundRobinRankBy` });

  return (
    <Combobox
      label="Rank By"
      value={value}
      onValueChange={(v) => form.setValue(`${prefix}.roundRobinRankBy`, v as CreateTournamentInput["finalStage"]["roundRobinRankBy"], { shouldValidate: true })}
      options={RANK_BY_OPTIONS}
    />
  );
}

function SwissPointsFields({ prefix }: { prefix: StagePrefix }) {
  const form = useFormContext<CreateTournamentInput>();

  const fields: { name: keyof CreateTournamentInput["groupStage"]["swissPoints"]; label: string }[] = [
    { name: "pointsPerMatchWin", label: "Points per Match Win" },
    { name: "pointsPerMatchTie", label: "Points per Match Tie" },
    { name: "pointsPerGameWin", label: "Points per Game/Set Win" },
    { name: "pointsPerGameTie", label: "Points per Game/Set Tie" },
    { name: "pointsPerBye", label: "Points per Bye" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(({ name, label }) => (
        <FormField
          key={name}
          control={form.control}
          name={`${prefix}.swissPoints.${name}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" min="0" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}

function GroupStageFields({
  locked = false,
  lockFormat = false,
  lockAdvance = false,
  lockSwissPoints = false,
}: {
  locked?: boolean;
  lockFormat?: boolean;
  lockAdvance?: boolean;
  lockSwissPoints?: boolean;
}) {
  const form = useFormContext<CreateTournamentInput>();
  const format = useWatch({ control: form.control, name: "groupStage.format" });

  return (
    <div className="space-y-5 border border-outline-variant/25 bg-surface-container-low p-5">
      <p className="label-mono text-primary">Group Stage</p>

      <fieldset disabled={locked || lockFormat} className="m-0 min-w-0 border-0 p-0">
        <StageFormatSelect name="groupStage.format" label="Group Format" stage="group" />
      </fieldset>

      <fieldset disabled={locked} className="m-0 min-w-0 space-y-5 border-0 p-0">
        {format === "round_robin" ? <RoundRobinPlayCountField prefix="groupStage" /> : null}

        {format === "double_elimination" ? (
          <FormField
            control={form.control}
            name="groupStage.splitParticipants"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                </FormControl>
                <FormLabel className="!mt-0">
                  Split Participants &mdash; start with half of the participants in the losers bracket.
                </FormLabel>
              </FormItem>
            )}
          />
        ) : null}
      </fieldset>

      {format === "swiss" ? (
        <fieldset disabled={lockSwissPoints} className="m-0 min-w-0 border-0 p-0">
          <SwissPointsFields prefix="groupStage" />
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
          <FormField
            control={form.control}
            name="groupStage.participantsPerGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Participants Compete in Each Group</FormLabel>
                <FormControl>
                  <Input type="number" min="2" step="1" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        <fieldset disabled={lockAdvance} className="m-0 min-w-0 border-0 p-0">
          <FormField
            control={form.control}
            name="groupStage.participantsAdvancePerGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Participants Advance from Each Group</FormLabel>
                <FormControl>
                  <Input type="number" min="1" step="1" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                {(format === "single_elimination" || format === "double_elimination") ? (
                  <p className="text-xs text-on-surface/50">Must be a power of 2 (1, 2, 4, 8, 16, ...).</p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
      </div>
    </div>
  );
}

function FinalStageFields() {
  const form = useFormContext<CreateTournamentInput>();
  const format = useWatch({ control: form.control, name: "finalStage.format" });
  const breakTies = useWatch({ control: form.control, name: "finalStage.breakTiesWithPlacementMatches" });
  const advancePerGroup = useWatch({ control: form.control, name: "groupStage.participantsAdvancePerGroup" });

  const maxPlace = Math.min(16, advancePerGroup || 16);
  const placeOptions = Array.from({ length: Math.max(maxPlace - 2, 0) }, (_, i) => {
    const place = i + 3;
    const suffix = place === 3 ? "rd" : place % 10 === 1 && place !== 11 ? "st" : place % 10 === 2 && place !== 12 ? "nd" : "th";
    return { value: String(place), label: `${place}${suffix} place` };
  });

  return (
    <div className="space-y-5 border border-outline-variant/25 bg-surface-container-low p-5">
      <p className="label-mono text-primary">Final Stage</p>
      <StageFormatSelect name="finalStage.format" label="Final Format" stage="final" />

      {format === "round_robin" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <RoundRobinPlayCountField prefix="finalStage" />
          <RankByField prefix="finalStage" />
        </div>
      ) : null}
      {format === "swiss" ? <SwissPointsFields prefix="finalStage" /> : null}

      {format === "double_elimination" ? (
        <FormField
          control={form.control}
          name="finalStage.splitParticipants"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              </FormControl>
              <FormLabel className="!mt-0">
                Split Participants &mdash; start with half of the participants in the losers bracket.
              </FormLabel>
            </FormItem>
          )}
        />
      ) : null}

      {format === "single_elimination" || format === "double_elimination" ? (
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="finalStage.breakTiesWithPlacementMatches"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                </FormControl>
                <FormLabel className="!mt-0">Break ties with placement matches</FormLabel>
              </FormItem>
            )}
          />
          {breakTies ? (
            <FormField
              control={form.control}
              name="finalStage.breakTiesThroughPlace"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Break Ties Through This Place</FormLabel>
                  <Combobox
                    label="Place"
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    options={placeOptions}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
      ) : null}

      {format === "double_elimination" ? (
        <div className="space-y-2">
          <FieldLabel>Grand Finals</FieldLabel>
          <p className="text-xs text-on-surface/50">
            The winners bracket finalist has to be defeated this many times by the losers bracket finalist.
          </p>
          <FormField
            control={form.control}
            name="finalStage.grandFinalsModifier"
            render={({ field }) => (
              <SegmentedControl value={field.value} onChange={field.onChange} options={GRAND_FINALS_OPTIONS} />
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

export function GameInfoSection({
  locked = false,
  lockStageType = false,
  lockGroupFormat = false,
  lockGroupAdvance = false,
  lockSwissPoints = false,
  lockFinalStage = false,
}: {
  // `locked` covers everything here except the fields below it, which the
  // organizer can keep tuning while the group stage is running — only
  // locking on their own, narrower triggers (the single/two-stage toggle
  // and group format once the group stage has started; participants
  // advance/Swiss points/final stage once it's *ended*). Pass `locked` on
  // its own (leaving the rest false) for the plain "whole section is locked
  // or not" case, e.g. the create wizard never locks anything.
  locked?: boolean;
  lockStageType?: boolean;
  lockGroupFormat?: boolean;
  lockGroupAdvance?: boolean;
  lockSwissPoints?: boolean;
  lockFinalStage?: boolean;
} = {}) {
  const form = useFormContext<CreateTournamentInput>();
  const stageType = useWatch({ control: form.control, name: "stageType" });

  return (
    <div className="space-y-6">
      <fieldset disabled={locked} className="m-0 min-w-0 space-y-6 border-0 p-0">
        <div className="space-y-2">
          <FieldLabel>Game</FieldLabel>
          <p className="text-sm text-on-surface/60">Beyblade X</p>
        </div>

        <fieldset disabled={lockStageType} className="m-0 min-w-0 space-y-2 border-0 p-0">
          <FieldLabel>Tournament Type</FieldLabel>
          <SegmentedControl
            value={stageType}
            onChange={(v) => form.setValue("stageType", v, { shouldValidate: true })}
            options={[
              { value: "single_stage", label: "Single Stage" },
              { value: "two_stage", label: "Two Stage Tournament" },
            ]}
          />
        </fieldset>

        {stageType === "single_stage" ? <StageFormatSelect name="singleStageFormat" label="Format" stage="single" /> : null}
      </fieldset>

      {stageType === "two_stage" ? (
        <div className="space-y-6">
          <GroupStageFields
            locked={locked}
            lockFormat={lockGroupFormat}
            lockAdvance={lockGroupAdvance}
            lockSwissPoints={lockSwissPoints}
          />
          <fieldset disabled={lockFinalStage} className="m-0 min-w-0 border-0 p-0">
            <FinalStageFields />
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
