"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  sponsorApplicationSchema,
  type SponsorApplicationInput,
  type RoleActionState,
} from "@/lib/validations/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const DONATION_TIERS = [
  { value: "1_month", price: "₱100", duration: "1 Month" },
  { value: "6_months", price: "₱500", duration: "6 Months" },
  { value: "1_year", price: "₱1,000", duration: "1 Year" },
];

export function SponsorProfileForm({
  action,
  defaultValues,
  submitLabel,
  showDonationTier,
}: {
  action: (input: SponsorApplicationInput) => Promise<RoleActionState>;
  defaultValues?: Partial<SponsorApplicationInput>;
  submitLabel: string;
  showDonationTier?: boolean;
}) {
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [donationTier, setDonationTier] = useState<string | null>(null);
  const [tierError, setTierError] = useState(false);

  const form = useForm<SponsorApplicationInput>({
    resolver: zodResolver(sponsorApplicationSchema),
    defaultValues: { companyName: "", websiteUrl: "", logoUrl: "", ...defaultValues },
  });

  async function onSubmit(values: SponsorApplicationInput) {
    if (showDonationTier && !donationTier) {
      setTierError(true);
      return;
    }
    setTierError(false);
    setSubmitting(true);
    setServerMessage(null);
    const result = await action(values);
    setSubmitting(false);
    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
    } else if (result.status === "success") {
      setServerMessage({ type: "success", text: result.message ?? "Saved." });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
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
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showDonationTier ? (
          <FormItem>
            <FormLabel>Donation Tier</FormLabel>
            <FormControl>
              <div className="grid grid-cols-3 gap-3">
                {DONATION_TIERS.map((tier) => (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => {
                      setDonationTier(tier.value);
                      setTierError(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 border px-3 py-4 text-center transition-colors",
                      donationTier === tier.value
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
            {tierError ? (
              <p className="text-sm font-medium text-destructive">Pick a donation tier to continue.</p>
            ) : null}
            <p className="text-sm text-on-surface/60">
              After sending your donation, email a screenshot of the receipt to{" "}
              <a href="mailto:xzviel@gmail.com" className="text-primary hover:underline">
                xzviel@gmail.com
              </a>{" "}
              so we can activate your sponsor listing.
            </p>
          </FormItem>
        ) : null}

        {serverMessage ? (
          <p
            role={serverMessage.type === "error" ? "alert" : "status"}
            className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
          >
            {serverMessage.text}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" tooltip={submitLabel} disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
