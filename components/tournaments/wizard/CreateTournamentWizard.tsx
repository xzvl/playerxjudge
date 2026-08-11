"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createTournament } from "@/app/account/organizer/tournament/new/actions";
import { uploadTournamentThumbnail, applySquareThumbnailAsBanner } from "@/app/account/organizer/tournament/shared-actions";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BasicInfoSection } from "@/components/tournaments/wizard/BasicInfoSection";
import { ThumbnailSection } from "@/components/tournaments/wizard/ThumbnailSection";
import { LocationSection } from "@/components/tournaments/wizard/LocationSection";
import { GameInfoSection } from "@/components/tournaments/wizard/GameInfoSection";
import { PrizePoolSection } from "@/components/tournaments/wizard/PrizePoolSection";
import { AdvancedOptionsSection } from "@/components/tournaments/wizard/AdvancedOptionsSection";
import {
  createTournamentSchema,
  DEFAULT_CREATE_TOURNAMENT_VALUES,
  type CreateTournamentInput,
} from "@/lib/validations/tournament-wizard";

export function CreateTournamentWizard({
  communities,
}: {
  communities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [squareFile, setSquareFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [useSquareForBanner, setUseSquareForBanner] = useState(false);

  const form = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: DEFAULT_CREATE_TOURNAMENT_VALUES,
  });

  async function onSubmit(values: CreateTournamentInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await createTournament(values);

    if (result.status === "error") {
      setSubmitting(false);
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
      return;
    }

    // Thumbnails only have somewhere to go once the tournament row (and its
    // id) exists — see ThumbnailSection's doc comment.
    if (result.id) {
      if (squareFile) {
        const formData = new FormData();
        formData.set("file", squareFile);
        await uploadTournamentThumbnail(result.id, "square", formData);
      }
      if (useSquareForBanner) {
        await applySquareThumbnailAsBanner(result.id);
      } else if (bannerFile) {
        const formData = new FormData();
        formData.set("file", bannerFile);
        await uploadTournamentThumbnail(result.id, "banner", formData);
      }
    }

    router.push("/account/organizer/tournament");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent>
            <BasicInfoSection communities={communities} editable />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thumbnail</CardTitle>
          </CardHeader>
          <CardContent>
            <ThumbnailSection
              tournamentId={null}
              initialSquareUrl={null}
              initialBannerUrl={null}
              onSquareFileReady={setSquareFile}
              onBannerFileReady={setBannerFile}
              onUseSquareForBannerChange={setUseSquareForBanner}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Game Info</CardTitle>
          </CardHeader>
          <CardContent>
            <GameInfoSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-on-surface">Registration Fee</p>
              <SegmentedControl
                value={form.watch("registrationFeeType")}
                onChange={(v) => form.setValue("registrationFeeType", v, { shouldValidate: true })}
                options={[
                  { value: "free", label: "Free" },
                  { value: "paid", label: "Paid" },
                ]}
              />
            </div>

            {form.watch("registrationFeeType") === "paid" ? (
              <FormField
                control={form.control}
                name="entryFee"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Amount (PHP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="registrationStartLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start of Pre-Registration (GMT+8:00)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationDeadlineLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End of Pre-Registration (GMT+8:00)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startsAtLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start of the Tournament (GMT+8:00)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
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
            <CardTitle>Prize Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <PrizePoolSection />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advanced Options</CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedOptionsSection />
          </CardContent>
        </Card>

        {serverMessage ? (
          <p
            role={serverMessage.type === "error" ? "alert" : "status"}
            className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
          >
            {serverMessage.text}
          </p>
        ) : null}

        <Button type="submit" size="lg" tooltip="Create this tournament" disabled={submitting}>
          {submitting ? "Creating..." : "Create Tournament"}
        </Button>
      </form>
    </Form>
  );
}
