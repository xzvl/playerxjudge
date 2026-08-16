"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createBeyblade, updateBeyblade, uploadBeybladeImage } from "@/app/backend/beyblades/actions";
import type { BeybladePickerOptions } from "@/app/backend/beyblades/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import {
  BEYBLADE_CATEGORY_OPTIONS,
  BEYBLADE_SERIES_OPTIONS,
  BEYBLADE_SPIN_DIRECTION_OPTIONS,
  BEYBLADE_SYSTEM_LINE_OPTIONS,
  BEYBLADE_TYPE_OPTIONS,
  beybladeSchema,
  DEFAULT_BEYBLADE_VALUES,
  type BeybladeInput,
} from "@/lib/validations/beyblade";
import type { Beyblade } from "@/lib/types/database";

const NONE_OPTION: ComboboxOption = { value: "", label: "— None —" };

function beybladeToFormValues(beyblade: Beyblade): BeybladeInput {
  const stat = (v: number | null) => (v === null ? "" : String(v));
  return {
    name: beyblade.name,
    shortName: beyblade.short_name,
    code: beyblade.code,
    type: beyblade.type,
    spinDirection: beyblade.spin_direction,
    attack: stat(beyblade.attack),
    defense: stat(beyblade.defense),
    stamina: stat(beyblade.stamina),
    height: stat(beyblade.height),
    dash: stat(beyblade.dash),
    burstResistance: stat(beyblade.burst_resistance),
    description: beyblade.description ?? "",
    series: beyblade.series,
    systemLine: beyblade.system_line,
    category: beyblade.category,
    expandBlade: beyblade.expand_blade,
    lockChipId: beyblade.lock_chip_id ?? "",
    mainBladeId: beyblade.main_blade_id ?? "",
    overBladeId: beyblade.over_blade_id ?? "",
    metalBladeId: beyblade.metal_blade_id ?? "",
    assistBladeId: beyblade.assist_blade_id ?? "",
  };
}

export function BeybladeForm({
  beyblade,
  pickerOptions,
}: {
  // Present in edit mode, absent when creating a new one.
  beyblade?: Beyblade;
  pickerOptions: BeybladePickerOptions;
}) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // In create mode there's no beyblade id yet, so the converted WebP file
  // is held here and only uploaded once the row exists (right after
  // createBeyblade returns one) — same pattern as SponsorListingForm /
  // CreateCommunityWizard. In edit mode it uploads immediately instead.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const form = useForm<BeybladeInput>({
    resolver: zodResolver(beybladeSchema),
    defaultValues: beyblade ? beybladeToFormValues(beyblade) : DEFAULT_BEYBLADE_VALUES,
  });

  const systemLine = form.watch("systemLine");
  const category = form.watch("category");
  const expandBlade = form.watch("expandBlade");
  // Only a Custom Line "Blade" is assembled from other parts — every other
  // system line / category combination is a standalone piece.
  const showBladeAssembly = systemLine === "custom_line" && category === "blade";

  async function handleImageReady(file: File) {
    if (!beyblade) {
      setImageFile(file);
      return;
    }
    setImageError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadBeybladeImage(beyblade.id, formData);
    if (result.status === "error") setImageError(result.message ?? "Upload failed.");
  }

  async function onSubmit(values: BeybladeInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = beyblade ? await updateBeyblade(beyblade.id, values) : await createBeyblade(values);

    if (result.status === "error") {
      setSubmitting(false);
      setServerMessage(result.message ?? "Something went wrong.");
      return;
    }

    if (result.id && imageFile) {
      const formData = new FormData();
      formData.set("file", imageFile);
      const imageResult = await uploadBeybladeImage(result.id, formData);
      if (imageResult.status === "error") {
        setSubmitting(false);
        setServerMessage(`Beyblade saved, but the image upload failed: ${imageResult.message ?? "unknown error"}`);
        return;
      }
    }

    setSubmitting(false);
    router.push("/backend/beyblades");
    router.refresh();
  }

  const lockChipOptions = [NONE_OPTION, ...pickerOptions.lockChips.map((o) => ({ value: o.id, label: o.name }))];
  const mainBladeOptions = [NONE_OPTION, ...pickerOptions.mainBlades.map((o) => ({ value: o.id, label: o.name }))];
  const overBladeOptions = [NONE_OPTION, ...pickerOptions.overBlades.map((o) => ({ value: o.id, label: o.name }))];
  const metalBladeOptions = [NONE_OPTION, ...pickerOptions.metalBlades.map((o) => ({ value: o.id, label: o.name }))];
  const assistBladeOptions = [NONE_OPTION, ...pickerOptions.assistBlades.map((o) => ({ value: o.id, label: o.name }))];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Beyblade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <ThumbnailUploadField
                label="Image"
                aspectClassName="aspect-square w-full max-w-[220px]"
                maxDimension={1000}
                initialUrl={beyblade?.image_url ?? null}
                onFileReady={handleImageReady}
                preserveAspectRatio
              />
              {imageError ? <p className="text-xs font-medium text-destructive">{imageError}</p> : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shortName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <SegmentedControl value={field.value} onChange={field.onChange} options={BEYBLADE_TYPE_OPTIONS} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="BX-01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spinDirection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spin Direction</FormLabel>
                    <FormControl>
                      <SegmentedControl value={field.value} onChange={field.onChange} options={BEYBLADE_SPIN_DIRECTION_OPTIONS} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-3">
            {(
              [
                ["attack", "Attack"],
                ["defense", "Defense"],
                ["stamina", "Stamina"],
                ["height", "Height"],
                ["dash", "Dash"],
                ["burstResistance", "Burst Resistance"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea {...field} rows={5} placeholder="What makes this piece worth using..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="series"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Series</FormLabel>
                  <FormControl>
                    <SegmentedControl value={field.value} onChange={field.onChange} options={BEYBLADE_SERIES_OPTIONS} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemLine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Line</FormLabel>
                  <FormControl>
                    <SegmentedControl value={field.value} onChange={field.onChange} options={BEYBLADE_SYSTEM_LINE_OPTIONS} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Combobox
                      label="Category"
                      hideLabel
                      value={field.value}
                      onValueChange={field.onChange}
                      options={BEYBLADE_CATEGORY_OPTIONS}
                      className="max-w-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {showBladeAssembly ? (
          <Card>
            <CardHeader>
              <CardTitle>Blade Assembly</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
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

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="lockChipId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Lock Chip</FormLabel>
                      <FormControl>
                        <Combobox label="Lock Chip" hideLabel placeholder="— None —" value={field.value} onValueChange={field.onChange} options={lockChipOptions} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assistBladeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Assist Blade</FormLabel>
                      <FormControl>
                        <Combobox label="Assist Blade" hideLabel placeholder="— None —" value={field.value} onValueChange={field.onChange} options={assistBladeOptions} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {expandBlade ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="overBladeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select a Over Blade</FormLabel>
                        <FormControl>
                          <Combobox label="Over Blade" hideLabel placeholder="— None —" value={field.value} onValueChange={field.onChange} options={overBladeOptions} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metalBladeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select a Metal Blade</FormLabel>
                        <FormControl>
                          <Combobox label="Metal Blade" hideLabel placeholder="— None —" value={field.value} onValueChange={field.onChange} options={metalBladeOptions} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="mainBladeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Main Blade</FormLabel>
                      <FormControl>
                        <Combobox label="Main Blade" hideLabel placeholder="— None —" value={field.value} onValueChange={field.onChange} options={mainBladeOptions} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        ) : null}

        {serverMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {serverMessage}
          </p>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" size="lg" tooltip="Save this beyblade" disabled={submitting}>
            {submitting ? "Saving..." : beyblade ? "Save Changes" : "Add Beyblade"}
          </Button>
          <Button type="button" variant="outline" size="lg" tooltip="Discard changes" onClick={() => router.push("/backend/beyblades")}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
