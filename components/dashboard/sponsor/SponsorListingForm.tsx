"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { uploadSponsorLogo } from "@/app/account/sponsor/new/shared-actions";
import { sponsorListingSchema, type SponsorListingInput, type RoleActionState } from "@/lib/validations/roles";
import { DONATION_TIERS } from "@/lib/sponsors/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThumbnailUploadField } from "@/components/tournaments/wizard/ThumbnailUploadField";
import { cn } from "@/lib/utils";

// Creates or edits one sponsor listing (app/account/sponsor/new and
// app/account/sponsor/[id]/edit). Logo upload mirrors CreateCommunityWizard:
// in create mode there's no sponsor id yet, so the converted WebP file is
// held in memory and only uploaded once the row exists; in edit mode
// (sponsorId already set) it uploads immediately, same as
// CommunityLogoSection's Settings path.
export function SponsorListingForm({
  sponsorId,
  action,
  defaultValues,
  initialLogoUrl,
  submitLabel,
}: {
  sponsorId: string | null;
  action: (input: SponsorListingInput) => Promise<RoleActionState & { id?: string }>;
  defaultValues?: Partial<SponsorListingInput>;
  initialLogoUrl?: string | null;
  submitLabel: string;
}) {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const form = useForm<SponsorListingInput>({
    resolver: zodResolver(sponsorListingSchema),
    defaultValues: {
      sponsorName: "",
      websiteUrl: "",
      facebookUrl: "",
      logoUrl: "",
      donationTier: undefined as unknown as SponsorListingInput["donationTier"],
      ...defaultValues,
    },
  });

  async function handleLogoReady(file: File) {
    if (!sponsorId) {
      setLogoFile(file);
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadSponsorLogo(sponsorId, formData);
    if (result.status === "error") setLogoError(result.message ?? "Upload failed.");
  }

  async function onSubmit(values: SponsorListingInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await action(values);

    if (result.status === "error") {
      setSubmitting(false);
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
      return;
    }

    if (result.id && logoFile) {
      const formData = new FormData();
      formData.set("file", logoFile);
      await uploadSponsorLogo(result.id, formData);
    }

    router.push("/account/sponsor/dashboard");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Sponsor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField
              control={form.control}
              name="sponsorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sponsor Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." autoComplete="url" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="facebookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook URL</FormLabel>
                  <FormControl>
                    <Input placeholder="facebook.com/yoursponsor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ThumbnailUploadField
              label="Logo"
              aspectClassName="aspect-square w-full max-w-[220px]"
              maxDimension={1000}
              initialUrl={initialLogoUrl ?? null}
              onFileReady={handleLogoReady}
              preserveAspectRatio
            />
            {logoError ? <p className="text-xs font-medium text-destructive">{logoError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donation Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="donationTier"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-3">
                      {DONATION_TIERS.map((tier) => (
                        <button
                          key={tier.value}
                          type="button"
                          onClick={() => field.onChange(tier.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 border px-3 py-4 text-center transition-colors",
                            field.value === tier.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-outline-variant/40 text-on-surface/70 hover:border-outline-variant/60"
                          )}
                        >
                          <span className="text-lg font-black">{tier.price}</span>
                          <span className="text-xs text-on-surface/60">{tier.duration}</span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-on-surface/60">
                    After sending your donation, email a screenshot of the receipt to{" "}
                    <a href="mailto:xzviel@gmail.com" className="text-primary hover:underline">
                      xzviel@gmail.com
                    </a>{" "}
                    so we can activate your sponsor listing.
                  </p>
                </FormItem>
              )}
            />
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

        <Button type="submit" size="lg" tooltip={submitLabel} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
