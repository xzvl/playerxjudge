"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { requestPasswordReset, updatePassword } from "@/app/(auth)/reset-actions";
import { magicLinkSchema, resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ResetPasswordForm() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHasSession(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  const passwordForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onRequestLink(e: React.FormEvent) {
    e.preventDefault();
    const parsed = magicLinkSchema.safeParse({ email });
    if (!parsed.success) {
      setMessage({ type: "error", text: "Enter a valid email address." });
      return;
    }
    setSubmitting(true);
    const result = await requestPasswordReset(parsed.data.email);
    setSubmitting(false);
    setMessage({
      type: result.status === "success" ? "success" : "error",
      text: result.message ?? "Something went wrong.",
    });
  }

  async function onUpdatePassword(values: ResetPasswordInput) {
    setSubmitting(true);
    const result = await updatePassword(values);
    setSubmitting(false);
    setMessage({
      type: result.status === "success" ? "success" : "error",
      text: result.message ?? "Something went wrong.",
    });
  }

  if (hasSession === null) {
    return <p className="text-sm text-on-surface/50">Loading...</p>;
  }

  if (hasSession) {
    return (
      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-4">
          <FormField
            control={passwordForm.control}
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
            control={passwordForm.control}
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
          {message ? (
            <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
              {message.text}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" tooltip="Update your password" disabled={submitting}>
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Form>
    );
  }

  return (
    <form onSubmit={onRequestLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      {message ? (
        <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
          {message.text}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" tooltip="Email yourself a password reset link" disabled={submitting}>
        {submitting ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}
