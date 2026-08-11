"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { changeAccountPassword } from "@/app/account/settings/actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function ChangePasswordForm() {
  const [serverMessage, setServerMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await changeAccountPassword(values);
    setSubmitting(false);
    if (result.status === "error") {
      setServerMessage({ type: "error", text: result.message ?? "Something went wrong." });
    } else if (result.status === "success") {
      setServerMessage({ type: "success", text: result.message ?? "Password updated." });
      form.reset({ password: "", confirmPassword: "" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
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

        <Button type="submit" tooltip="Update your account password" disabled={submitting}>
          {submitting ? "Updating..." : "Change Password"}
        </Button>
      </form>
    </Form>
  );
}
