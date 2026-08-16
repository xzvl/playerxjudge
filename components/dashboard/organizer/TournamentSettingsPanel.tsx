"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BasicInfoSection } from "@/components/tournaments/wizard/BasicInfoSection";
import { ThumbnailSection } from "@/components/tournaments/wizard/ThumbnailSection";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import { LocationSection } from "@/components/tournaments/wizard/LocationSection";
import { GameInfoSection } from "@/components/tournaments/wizard/GameInfoSection";
import { PrizePoolSection } from "@/components/tournaments/wizard/PrizePoolSection";
import { AdvancedOptionsSection } from "@/components/tournaments/wizard/AdvancedOptionsSection";
import { uploadPaymentQr } from "@/app/account/organizer/tournament/shared-actions";
import {
  createTournamentSchema,
  isTournamentEditable,
  tournamentToFormValues,
  type CreateTournamentInput,
} from "@/lib/validations/tournament-wizard";
import { deleteTournament, updateTournamentDetails } from "@/app/account/organizer/tournament/[slug]/actions";
import { resetTournamentProgress } from "@/app/account/organizer/tournament/[slug]/matches-actions";
import type { Tournament, TournamentPrize } from "@/lib/types/database";

export function TournamentSettingsPanel({
  tournament,
  communities,
  prizes,
  groupStageStarted,
  basePath = "/account/organizer/tournament",
}: {
  tournament: Tournament;
  // Lets /backend/tournaments/[slug]/settings reuse this component
  // unchanged — where a save/delete/reset redirects to afterward differs
  // by context (an admin managing someone else's tournament has no access
  // to /account/organizer/tournament/[slug], which 404s for non-owners —
  // see getManagedTournament).
  basePath?: string;
  communities: { id: string; name: string }[];
  prizes: TournamentPrize[];
  // Whether the group stage (or single-stage bracket) has generated its
  // first matches — a narrower set of fields locks on this specifically
  // (slug, single/two-stage toggle, group format, the three schedule
  // dates, group tie breaks), independent of `editable` below.
  groupStageStarted: boolean;
}) {
  const router = useRouter();
  // Editable at any point up to "completed"/"cancelled" — see
  // EDITABLE_TOURNAMENT_STATUSES. `groupStageStarted` below layers a
  // narrower lock on top while the tournament is otherwise still editable.
  const editable = isTournamentEditable(tournament.status);
  const finalStageStarted = tournament.format_settings?.groupStageEnded === true;

  const [detailsMessage, setDetailsMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, startResetting] = useTransition();
  const [resetError, setResetError] = useState<string | null>(null);

  const form = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: tournamentToFormValues(tournament, prizes),
  });

  async function onSubmit(values: CreateTournamentInput) {
    setSubmitting(true);
    setDetailsMessage(null);
    const result = await updateTournamentDetails(tournament.id, tournament.slug, values);
    setSubmitting(false);

    if (result.status === "error") {
      setDetailsMessage({ type: "error", text: result.message ?? "Something went wrong." });
      return;
    }
    if (result.slug && result.slug !== tournament.slug) {
      router.push(`${basePath}/${result.slug}/settings`);
      return;
    }
    setDetailsMessage({ type: "success", text: result.message ?? "Saved." });
    router.refresh();
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleting(async () => {
      const result = await deleteTournament(tournament.id);
      if (result.status === "error") {
        setDeleteError(result.message ?? "Something went wrong.");
        return;
      }
      router.push(basePath);
    });
  }

  function handleResetProgress() {
    setResetError(null);
    startResetting(async () => {
      const result = await resetTournamentProgress(tournament.id, tournament.slug);
      if (result.status === "error") {
        setResetError(result.message ?? "Something went wrong.");
        return;
      }
      setResetOpen(false);
      router.push(`${basePath}/${tournament.slug}`);
    });
  }

  return (
    <div className="max-w-2xl space-y-8">
      {!editable ? (
        <p className="border border-outline-variant/25 bg-surface-container-low p-4 text-sm text-on-surface/60">
          This tournament has ended and can no longer be edited.
        </p>
      ) : groupStageStarted ? (
        <p className="border border-outline-variant/25 bg-surface-container-low p-4 text-sm text-on-surface/60">
          The group stage has started, so the URL slug, Tournament Type, Group Format, the three schedule dates, and the
          Group Tie Breaks are locked in — everything else here can still be changed.
        </p>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <fieldset disabled={!editable} className="m-0 min-w-0 space-y-8 border-0 p-0">
            <Card>
              <CardHeader>
                <CardTitle>Basic Info</CardTitle>
              </CardHeader>
              <CardContent>
                <BasicInfoSection
                  communities={communities}
                  excludeTournamentId={tournament.id}
                  editable={editable}
                  lockSlug={groupStageStarted}
                />
              </CardContent>
            </Card>
          </fieldset>

          <Card>
            <CardHeader>
              <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent>
              <ThumbnailSection
                tournamentId={tournament.id}
                initialSquareUrl={tournament.thumbnail_url}
                initialBannerUrl={tournament.banner_url}
                initialUseSquareForBanner={tournament.banner_url !== null && tournament.banner_url === tournament.thumbnail_url}
              />
            </CardContent>
          </Card>

          <fieldset disabled={!editable} className="m-0 min-w-0 space-y-8 border-0 p-0">
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <LocationSection locked={!editable} />
              </CardContent>
            </Card>
          </fieldset>

          <Card>
            <CardHeader>
              <CardTitle>Game Info</CardTitle>
            </CardHeader>
            <CardContent>
              <GameInfoSection
                locked={!editable}
                lockStageType={groupStageStarted}
                lockGroupFormat={groupStageStarted}
                lockGroupAdvance={finalStageStarted}
                lockSwissPoints={finalStageStarted}
                lockFinalStage={finalStageStarted}
              />
            </CardContent>
          </Card>

          <fieldset disabled={!editable} className="m-0 min-w-0 space-y-8 border-0 p-0">
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
                  <>
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

                    <label className="flex items-center gap-3 text-sm text-on-surface">
                      <Checkbox
                        checked={form.watch("requiresPreregistrationPayment")}
                        onChange={(e) => form.setValue("requiresPreregistrationPayment", e.target.checked, { shouldValidate: true })}
                      />
                      Collect payment during pre-registration
                    </label>

                    {form.watch("requiresPreregistrationPayment") ? (
                      <div className="space-y-5 border border-outline-variant/25 bg-surface-container-low p-4">
                        <FormField
                          control={form.control}
                          name="preregistrationAmount"
                          render={({ field }) => (
                            <FormItem className="max-w-xs">
                              <FormLabel>Pre-Registration Amount (PHP)</FormLabel>
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
                        <FormField
                          control={form.control}
                          name="preregistrationInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instructions</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="How to pay — e.g. GCash number, account name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <ThumbnailUploadField
                          label="QR Code Image"
                          aspectClassName="aspect-square w-full max-w-[220px]"
                          maxDimension={1000}
                          initialUrl={tournament.preregistration_qr_url}
                          onFileReady={async (file) => {
                            const formData = new FormData();
                            formData.set("file", file);
                            const result = await uploadPaymentQr(tournament.id, formData);
                            if (result.status === "error") {
                              setDetailsMessage({ type: "error", text: result.message ?? "QR code upload failed." });
                            }
                          }}
                        />
                        <p className="text-xs text-on-surface/50">JPG, PNG, or WebP — JPG/PNG are converted to WebP automatically.</p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <fieldset disabled={groupStageStarted} className="m-0 min-w-0 grid gap-5 border-0 p-0 sm:grid-cols-2">
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
                </fieldset>
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
                <AdvancedOptionsSection lockGroupTieBreaks={groupStageStarted} />
              </CardContent>
            </Card>
          </fieldset>

          {detailsMessage ? (
            <p
              role={detailsMessage.type === "error" ? "alert" : "status"}
              className={detailsMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
            >
              {detailsMessage.text}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {editable ? (
              <Button type="submit" size="lg" tooltip="Save these changes" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="lg"
              tooltip="Clear all match progress and stop the tournament"
              onClick={() => setResetOpen(true)}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              tooltip="Permanently delete this tournament"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset tournament progress?</DialogTitle>
            <DialogDescription>
              This clears every match from the group stage and final stage — rounds, scores, everything — and stops the
              tournament. Participants and groups stay as they are, but you&apos;ll need to click Start Group Stage again to
              resume. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {resetError ? (
            <p role="alert" className="px-6 text-sm text-destructive">
              {resetError}
            </p>
          ) : null}
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="outline" tooltip="Keep the current progress" disabled={resetting} onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              tooltip="Delete every match, un-end the group stage, and stop the tournament"
              disabled={resetting}
              onClick={handleResetProgress}
            >
              {resetting ? "Resetting..." : "Reset Progress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this tournament?</DialogTitle>
            <DialogDescription>
              This permanently deletes &quot;{tournament.title}&quot; and everything in it — participants, groups, prizes,
              and match history. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p role="alert" className="px-6 text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="outline" tooltip="Keep this tournament" disabled={deleting} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" tooltip="This can't be undone" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting..." : "Delete Tournament"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
