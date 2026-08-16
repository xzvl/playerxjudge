"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { applyForSponsor } from "@/app/become/sponsor/actions";
import { sponsorApplicationSchema, type SponsorApplicationInput } from "@/lib/validations/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// The /become/sponsor role-gate form — just enough for an admin to review
// the application. The actual sponsor listing (name, website, Facebook,
// logo, donation tier) is created afterwards, once approved, from
// /account/sponsor/new — see SponsorListingForm.
export function SponsorApplicationForm() {
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<SponsorApplicationInput>({
    resolver: zodResolver(sponsorApplicationSchema),
    defaultValues: { companyName: "", websiteUrl: "", phone: "" },
  });

  async function onSubmit(values: SponsorApplicationInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await applyForSponsor(values);
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="09XX XXX XXXX" autoComplete="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverMessage ? (
          <p
            role={serverMessage.type === "error" ? "alert" : "status"}
            className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
          >
            {serverMessage.text}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" tooltip="Submit Application" disabled={submitting}>
          {submitting ? "Saving..." : "Submit Application"}
        </Button>
      </form>
    </Form>
  );
}
