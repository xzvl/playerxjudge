"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createCombo, updateCombo } from "@/app/account/beyblade/actions";
import type { ComboPartOption, ComboPickerOptions, ComboWithParts } from "@/app/account/beyblade/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ComboStatBars, PartThumbnail } from "@/components/dashboard/beyblade/combo-ui";
import { computeComboStats, type ComboStats } from "@/lib/beyblades/combo-stats";
import { beybladeComboSchema, DEFAULT_BEYBLADE_COMBO_VALUES, type BeybladeComboInput } from "@/lib/validations/beyblade-combo";

const NONE_OPTION: ComboboxOption = { value: "", label: "— None —" };

const BLADE_MODE_OPTIONS = [
  { value: "existing", label: "Pick Existing Blade" },
  { value: "custom", label: "Build Custom Blade" },
] as const;

// Each field labels its options differently: Blade shows just the full
// name (its short name doesn't add much — Blade names are already short),
// Ratchet shows only the short name (its full name is usually just the
// short name spelled out, e.g. "3-60"), Bit shows both, e.g. "Flat (F)".
// The 5 Custom Line assembly pickers below all use short name too.
function toOptions(parts: ComboPartOption[], label: (p: ComboPartOption) => string): ComboboxOption[] {
  return parts.map((p) => ({ value: p.id, label: label(p), imageUrl: p.imageUrl }));
}

const bladeOptions = (parts: ComboPartOption[]) => toOptions(parts, (p) => p.name);
const ratchetOptions = (parts: ComboPartOption[]) => toOptions(parts, (p) => p.shortName);
const bitOptions = (parts: ComboPartOption[]) => toOptions(parts, (p) => `${p.name} (${p.shortName})`);
const assemblyOptions = (parts: ComboPartOption[]) => [NONE_OPTION, ...toOptions(parts, (p) => p.shortName)];

// combo.blade.id is "" for a self-assembled Blade (see synthesizeCustomBlade,
// app/account/beyblade/data.ts) — that's how edit mode tells the two Blade
// modes apart and knows whether to prefill the assembly fields.
function comboToFormValues(combo: ComboWithParts): BeybladeComboInput {
  const isCustom = combo.blade.id === "";
  return {
    name: combo.name,
    bladeMode: isCustom ? "custom" : "existing",
    bladeId: isCustom ? "" : combo.blade.id,
    expandBlade: isCustom ? combo.blade.expandBlade : false,
    lockChipId: isCustom ? (combo.blade.lockChipId ?? "") : "",
    mainBladeId: isCustom ? (combo.blade.mainBladeId ?? "") : "",
    overBladeId: isCustom ? (combo.blade.overBladeId ?? "") : "",
    metalBladeId: isCustom ? (combo.blade.metalBladeId ?? "") : "",
    assistBladeId: isCustom ? (combo.blade.assistBladeId ?? "") : "",
    ratchetId: combo.ratchet?.id ?? "",
    bitId: combo.bit.id,
  };
}

// One read-only row in an *existing* catalog Blade's own sub-assembly
// preview — those parts are fixed on that Blade (set via the admin
// catalog's Blade Assembly, see BeybladeForm), not something picked here.
// Not to be confused with the editable assembly fields further down, which
// build a brand new Blade rather than showing an existing one's.
function AssemblyPartPreview({ label, part }: { label: string; part: ComboPartOption | undefined }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-on-surface/60">{label}</p>
      {part ? (
        <div className="flex items-center gap-2">
          <PartThumbnail part={part} size="sm" fit="contain" />
          <span className="truncate text-sm text-on-surface">{part.name}</span>
        </div>
      ) : (
        <p className="text-sm text-on-surface/30">— None —</p>
      )}
    </div>
  );
}

export function ComboForm({
  combo,
  pickerOptions,
}: {
  // Present in edit mode, absent when creating a new one.
  combo?: ComboWithParts;
  pickerOptions: ComboPickerOptions;
}) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BeybladeComboInput>({
    resolver: zodResolver(beybladeComboSchema),
    defaultValues: combo ? comboToFormValues(combo) : DEFAULT_BEYBLADE_COMBO_VALUES,
  });

  const bladeMode = form.watch("bladeMode");
  const bladeId = form.watch("bladeId");
  const expandBlade = form.watch("expandBlade");
  const lockChipId = form.watch("lockChipId");
  const mainBladeId = form.watch("mainBladeId");
  const overBladeId = form.watch("overBladeId");
  const metalBladeId = form.watch("metalBladeId");
  const assistBladeId = form.watch("assistBladeId");
  const ratchetId = form.watch("ratchetId");
  const bitId = form.watch("bitId");

  const selectedExistingBlade = pickerOptions.blades.find((b) => b.id === bladeId) ?? null;
  const selectedLockChip = pickerOptions.lockChips.find((p) => p.id === lockChipId) ?? null;
  const selectedMainBlade = pickerOptions.mainBlades.find((p) => p.id === mainBladeId) ?? null;
  const selectedOverBlade = pickerOptions.overBlades.find((p) => p.id === overBladeId) ?? null;
  const selectedMetalBlade = pickerOptions.metalBlades.find((p) => p.id === metalBladeId) ?? null;
  const selectedAssistBlade = pickerOptions.assistBlades.find((p) => p.id === assistBladeId) ?? null;
  const selectedRatchet = pickerOptions.ratchets.find((r) => r.id === ratchetId) ?? null;
  const selectedBit = pickerOptions.bits.find((b) => b.id === bitId) ?? null;

  // The label a self-assembled Blade gets, live as its parts are picked —
  // same concatenation the data layer uses once saved (synthesizeCustomBlade,
  // app/account/beyblade/data.ts): Lock Chip + Main Blade names, or
  // expanded, + Metal Blade name + Over Blade short name, always + Assist
  // Blade short name.
  const customBladeCore = expandBlade ? selectedMetalBlade : selectedMainBlade;
  const customBladeLabel = [selectedLockChip?.name, customBladeCore?.name, expandBlade ? selectedOverBlade?.shortName : null, selectedAssistBlade?.shortName]
    .filter((s): s is string => !!s)
    .join(" ");

  // The range bars are view-only — they visualize whatever's currently
  // picked, recomputed on every selection change, but there's nothing here
  // to directly edit them (see StatRangeBar).
  const customBladeStats = useMemo(
    () =>
      computeComboStats(
        expandBlade ? [selectedLockChip, selectedOverBlade, selectedMetalBlade, selectedAssistBlade] : [selectedLockChip, selectedMainBlade, selectedAssistBlade]
      ),
    [expandBlade, selectedLockChip, selectedMainBlade, selectedOverBlade, selectedMetalBlade, selectedAssistBlade]
  );
  const bladeStatsSource: ComboStats | ComboPartOption | null = bladeMode === "custom" ? customBladeStats : selectedExistingBlade;
  const stats = useMemo(
    () => computeComboStats([bladeStatsSource, selectedRatchet, selectedBit]),
    [bladeStatsSource, selectedRatchet, selectedBit]
  );

  // A Ratchet-Integrated Blade/Bit is a single physical piece that already
  // supplies the ratchet layer — a combo only ever has one, so picking
  // either one hides the separate Ratchet field and rules the *other*
  // Ratchet-Integrated part out of its own dropdown (can't have two). A
  // self-assembled Blade is never Ratchet-Integrated (that's always an
  // existing catalog piece), so this only applies in "existing" mode.
  const bladeIsIntegrated = bladeMode === "existing" && selectedExistingBlade?.category === "ratchet_integrated_blade";
  const bitIsIntegrated = selectedBit?.category === "ratchet_integrated_bit";
  const ratchetHidden = bladeIsIntegrated || bitIsIntegrated;

  const availableBlades = pickerOptions.blades.filter((b) => !(bitIsIntegrated && b.category === "ratchet_integrated_blade"));
  const availableBits = pickerOptions.bits.filter((b) => !(bladeIsIntegrated && b.category === "ratchet_integrated_bit"));

  useEffect(() => {
    if (ratchetHidden && form.getValues("ratchetId")) form.setValue("ratchetId", "");
    // form isn't in the deps — it's stable from useForm and including it
    // would just re-run this for unrelated reasons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratchetHidden]);

  // Only an *existing* Custom Line Blade (not a Ratchet-Integrated one —
  // those aren't assembled via the admin's Blade Assembly, see
  // BeybladeForm) has its own sub-assembly worth previewing.
  const showBladeSubAssembly = bladeMode === "existing" && selectedExistingBlade?.category === "blade" && selectedExistingBlade?.systemLine === "custom_line";
  const previewLockChip = selectedExistingBlade?.lockChipId ? pickerOptions.lockChips.find((p) => p.id === selectedExistingBlade.lockChipId) : undefined;
  const previewMainBlade = selectedExistingBlade?.mainBladeId ? pickerOptions.mainBlades.find((p) => p.id === selectedExistingBlade.mainBladeId) : undefined;
  const previewOverBlade = selectedExistingBlade?.overBladeId ? pickerOptions.overBlades.find((p) => p.id === selectedExistingBlade.overBladeId) : undefined;
  const previewMetalBlade = selectedExistingBlade?.metalBladeId ? pickerOptions.metalBlades.find((p) => p.id === selectedExistingBlade.metalBladeId) : undefined;
  const previewAssistBlade = selectedExistingBlade?.assistBladeId ? pickerOptions.assistBlades.find((p) => p.id === selectedExistingBlade.assistBladeId) : undefined;
  const previewExpanded = selectedExistingBlade?.expandBlade ?? false;

  async function onSubmit(values: BeybladeComboInput) {
    if (values.bladeMode === "existing") {
      if (!values.bladeId.trim()) {
        form.setError("bladeId", { message: "Pick a blade" });
        return;
      }
    } else {
      if (!values.lockChipId.trim()) {
        form.setError("lockChipId", { message: "Pick a lock chip" });
        return;
      }
      if (values.expandBlade) {
        if (!values.metalBladeId.trim()) {
          form.setError("metalBladeId", { message: "Pick a metal blade" });
          return;
        }
        if (!values.overBladeId.trim()) {
          form.setError("overBladeId", { message: "Pick an over blade" });
          return;
        }
      } else if (!values.mainBladeId.trim()) {
        form.setError("mainBladeId", { message: "Pick a main blade" });
        return;
      }
      if (!values.assistBladeId.trim()) {
        form.setError("assistBladeId", { message: "Pick an assist blade" });
        return;
      }
    }

    if (!ratchetHidden && !values.ratchetId.trim()) {
      form.setError("ratchetId", { message: "Pick a ratchet" });
      return;
    }

    setSubmitting(true);
    setServerMessage(null);
    const result = combo ? await updateCombo(combo.id, values) : await createCombo(values);

    if (result.status === "error") {
      setSubmitting(false);
      setServerMessage(result.message ?? "Something went wrong.");
      return;
    }

    setSubmitting(false);
    router.push("/account/beyblade/combos");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Combo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Combo Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Attack Combo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bladeMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <SegmentedControl value={field.value} onChange={field.onChange} options={BLADE_MODE_OPTIONS} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {bladeMode === "existing" ? (
              <>
                <FormField
                  control={form.control}
                  name="bladeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blade</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Combobox
                            className="flex-1"
                            label="Blade"
                            hideLabel
                            placeholder="Select a blade"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={bladeOptions(availableBlades)}
                          />
                          {selectedExistingBlade ? <PartThumbnail part={selectedExistingBlade} size="sm" fit="contain" /> : null}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showBladeSubAssembly ? (
                  <div className="space-y-4 border border-outline-variant/20 bg-surface-container-low p-4">
                    <p className="label-mono text-on-surface/40">This Blade is a Custom Line assembly</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AssemblyPartPreview label="Lock Chip" part={previewLockChip} />
                      {previewExpanded ? (
                        <AssemblyPartPreview label="Metal Blade" part={previewMetalBlade} />
                      ) : (
                        <AssemblyPartPreview label="Main Blade" part={previewMainBlade} />
                      )}
                    </div>
                    <div className={previewExpanded ? "grid gap-4 sm:grid-cols-2" : undefined}>
                      {previewExpanded ? <AssemblyPartPreview label="Over Blade" part={previewOverBlade} /> : null}
                      <AssemblyPartPreview label="Assist Blade" part={previewAssistBlade} />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-4 border border-outline-variant/20 bg-surface-container-low p-4">
                <div>
                  <FormLabel>Blade (generated)</FormLabel>
                  <Input value={customBladeLabel} disabled readOnly placeholder="Pick the parts below..." className="mt-1.5" />
                </div>

                <FormField
                  control={form.control}
                  name="expandBlade"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Expand Blade</FormLabel>
                    </FormItem>
                  )}
                />

                {/* Lock Chip always leads row 1, paired with Main Blade —
                    or, expanded, Metal Blade. Assist Blade sits alone on
                    row 2 — or, expanded, paired there with Over Blade. */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="lockChipId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lock Chip</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Combobox
                              className="flex-1"
                              label="Lock Chip"
                              hideLabel
                              placeholder="— None —"
                              value={field.value}
                              onValueChange={field.onChange}
                              options={assemblyOptions(pickerOptions.lockChips)}
                            />
                            {selectedLockChip ? <PartThumbnail part={selectedLockChip} size="sm" fit="contain" /> : null}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {expandBlade ? (
                    <FormField
                      control={form.control}
                      name="metalBladeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metal Blade</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Combobox
                                className="flex-1"
                                label="Metal Blade"
                                hideLabel
                                placeholder="— None —"
                                value={field.value}
                                onValueChange={field.onChange}
                                options={assemblyOptions(pickerOptions.metalBlades)}
                              />
                              {selectedMetalBlade ? <PartThumbnail part={selectedMetalBlade} size="sm" fit="contain" /> : null}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="mainBladeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Main Blade</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Combobox
                                className="flex-1"
                                label="Main Blade"
                                hideLabel
                                placeholder="— None —"
                                value={field.value}
                                onValueChange={field.onChange}
                                options={assemblyOptions(pickerOptions.mainBlades)}
                              />
                              {selectedMainBlade ? <PartThumbnail part={selectedMainBlade} size="sm" fit="contain" /> : null}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className={expandBlade ? "grid gap-4 sm:grid-cols-2" : undefined}>
                  {expandBlade ? (
                    <FormField
                      control={form.control}
                      name="overBladeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Over Blade</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Combobox
                                className="flex-1"
                                label="Over Blade"
                                hideLabel
                                placeholder="— None —"
                                value={field.value}
                                onValueChange={field.onChange}
                                options={assemblyOptions(pickerOptions.overBlades)}
                              />
                              {selectedOverBlade ? <PartThumbnail part={selectedOverBlade} size="sm" fit="contain" /> : null}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                  <FormField
                    control={form.control}
                    name="assistBladeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assist Blade</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Combobox
                              className="flex-1"
                              label="Assist Blade"
                              hideLabel
                              placeholder="— None —"
                              value={field.value}
                              onValueChange={field.onChange}
                              options={assemblyOptions(pickerOptions.assistBlades)}
                            />
                            {selectedAssistBlade ? <PartThumbnail part={selectedAssistBlade} size="sm" fit="contain" /> : null}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {ratchetHidden ? (
              <p className="text-xs text-on-surface/50">
                {bladeIsIntegrated ? "This Blade" : "This Bit"} already includes a built-in ratchet — no separate Ratchet needed.
              </p>
            ) : (
              <FormField
                control={form.control}
                name="ratchetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ratchet</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Combobox
                          className="flex-1"
                          label="Ratchet"
                          hideLabel
                          placeholder="Select a ratchet"
                          value={field.value}
                          onValueChange={field.onChange}
                          options={ratchetOptions(pickerOptions.ratchets)}
                        />
                        {selectedRatchet ? <PartThumbnail part={selectedRatchet} size="sm" fit="contain" /> : null}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="bitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bit</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <Combobox
                        className="flex-1"
                        label="Bit"
                        hideLabel
                        placeholder="Select a bit"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={bitOptions(availableBits)}
                      />
                      {selectedBit ? <PartThumbnail part={selectedBit} size="sm" fit="contain" /> : null}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Combo Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <ComboStatBars stats={stats} />
          </CardContent>
        </Card>

        {serverMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {serverMessage}
          </p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" size="lg" tooltip="Save this combo" disabled={submitting}>
            {submitting ? "Saving..." : combo ? "Save Changes" : "Add Beyblade Combo"}
          </Button>
          <Button type="button" variant="outline" size="lg" tooltip="Discard changes" onClick={() => router.push("/account/beyblade/combos")}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
