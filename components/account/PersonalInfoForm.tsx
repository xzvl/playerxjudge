"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updatePersonalInfo } from "@/app/account/settings/actions";
import { personalInfoSchema, type PersonalInfoInput } from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function PersonalInfoForm({ defaultValues }: { defaultValues: PersonalInfoInput }) {
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PersonalInfoInput>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues,
  });

  async function onSubmit(values: PersonalInfoInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await updatePersonalInfo(values);
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
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="facebookName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook Name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input type="url" placeholder="https://facebook.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {serverMessage ? (
          <p
            role={serverMessage.type === "error" ? "alert" : "status"}
            className={serverMessage.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}
          >
            {serverMessage.text}
          </p>
        ) : null}

        <Button type="submit" tooltip="Save your personal information" disabled={submitting}>
          {submitting ? "Saving..." : "Save Personal Information"}
        </Button>
      </form>
    </Form>
  );
}
