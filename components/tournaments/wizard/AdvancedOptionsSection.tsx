"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import {
  RANK_BY_OPTIONS,
  TIE_BREAK_OPTIONS,
  type CreateTournamentInput,
  type RankByMetric,
} from "@/lib/validations/tournament-wizard";
import type { BracketFormat } from "@/lib/types/database";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold text-on-surface">{children}</p>;
}

type TieBreakField = "tieBreak1" | "tieBreak2" | "tieBreak3";

function TieBreakSelect({
  tabPrefix,
  field,
  label,
}: {
  tabPrefix: "groupTieBreaks" | "finalTieBreaks";
  field: TieBreakField;
  label: string;
}) {
  const form = useFormContext<CreateTournamentInput>();
  const name = `${tabPrefix}.${field}` as const;
  const value = useWatch({ control: form.control, name });

  return (
    <Combobox
      label={label}
      value={value}
      onValueChange={(v) =>
        form.setValue(name, v as CreateTournamentInput["groupTieBreaks"]["tieBreak1"], { shouldValidate: true })
      }
      options={TIE_BREAK_OPTIONS}
    />
  );
}

function StageTieBreaksFields({
  tabPrefix,
  stageFormat,
  stageRankBy,
}: {
  tabPrefix: "groupTieBreaks" | "finalTieBreaks";
  stageFormat: BracketFormat;
  stageRankBy: RankByMetric;
}) {
  const applicable = stageFormat === "round_robin" || stageFormat === "swiss";

  if (!applicable) {
    return (
      <p className="text-sm text-on-surface/50">
        Tie breaks apply when this stage&apos;s format is Round Robin or Swiss.
      </p>
    );
  }

  const rankByLabel =
    stageFormat === "swiss" ? "Swiss System Points" : RANK_BY_OPTIONS.find((o) => o.value === stageRankBy)?.label ?? "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FieldLabel>Rank By</FieldLabel>
        <p className="border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface/70">
          {rankByLabel}
        </p>
      </div>
      <TieBreakSelect tabPrefix={tabPrefix} field="tieBreak1" label="Tie Break #1" />
      <TieBreakSelect tabPrefix={tabPrefix} field="tieBreak2" label="Tie Break #2" />
      <TieBreakSelect tabPrefix={tabPrefix} field="tieBreak3" label="Tie Break #3" />
    </div>
  );
}

function BracketOptionsFields({ showRoundLabelsOption }: { showRoundLabelsOption: boolean }) {
  const form = useFormContext<CreateTournamentInput>();

  const options: { name: keyof CreateTournamentInput["bracketOptions"]; label: string }[] = [
    ...(showRoundLabelsOption
      ? ([{ name: "showCustomRoundLabels", label: "Show customizable round labels." }] as const)
      : []),
    { name: "hideSeedNumbers", label: "Hide the seed numbers." },
    { name: "hideBracketPreview", label: "Hide the bracket preview from the public." },
    { name: "quickAdvance", label: "Quick advance — report winners only, not scores." },
    { name: "allowMatchAttachments", label: "Allow match attachments." },
  ];

  return (
    <div className="space-y-4">
      {options.map(({ name, label }) => (
        <FormField
          key={name}
          control={form.control}
          name={`bracketOptions.${name}`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
              </FormControl>
              <FormLabel className="!mt-0">{label}</FormLabel>
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}

export function AdvancedOptionsSection({ lockGroupTieBreaks = false }: { lockGroupTieBreaks?: boolean } = {}) {
  const form = useFormContext<CreateTournamentInput>();
  const stageType = useWatch({ control: form.control, name: "stageType" });
  const groupFormat = useWatch({ control: form.control, name: "groupStage.format" });
  const groupRankBy = useWatch({ control: form.control, name: "groupStage.roundRobinRankBy" });
  const finalFormat = useWatch({ control: form.control, name: "finalStage.format" });
  const finalRankBy = useWatch({ control: form.control, name: "finalStage.roundRobinRankBy" });

  const isTwoStage = stageType === "two_stage";

  return (
    <Tabs defaultValue="bracket">
      <TabsList>
        <TabsTrigger value="bracket">Bracket</TabsTrigger>
        {isTwoStage ? <TabsTrigger value="group-tie-breaks">Group Tie Breaks</TabsTrigger> : null}
        {isTwoStage ? <TabsTrigger value="tie-breaks">Tie Breaks</TabsTrigger> : null}
      </TabsList>

      {isTwoStage ? (
        <TabsContent value="group-tie-breaks">
          <fieldset disabled={lockGroupTieBreaks} className="m-0 min-w-0 border-0 p-0">
            {lockGroupTieBreaks ? (
              <p className="mb-4 text-xs text-on-surface/40">
                These are locked in once the group stage has started — changing them would disagree with standings
                already computed from the earlier rounds.
              </p>
            ) : null}
            <StageTieBreaksFields tabPrefix="groupTieBreaks" stageFormat={groupFormat} stageRankBy={groupRankBy} />
          </fieldset>
        </TabsContent>
      ) : null}

      {isTwoStage ? (
        <TabsContent value="tie-breaks">
          <StageTieBreaksFields tabPrefix="finalTieBreaks" stageFormat={finalFormat} stageRankBy={finalRankBy} />
        </TabsContent>
      ) : null}

      <TabsContent value="bracket">
        <BracketOptionsFields showRoundLabelsOption={!isTwoStage} />
      </TabsContent>
    </Tabs>
  );
}
