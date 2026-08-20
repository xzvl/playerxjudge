"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { signInWithPassword, signInWithMagicLink } from "@/app/(auth)/actions";
import { loginSchema, magicLinkSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoogleButton } from "@/components/auth/GoogleButton";

export function LoginForm() {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    setServerMessage(null);
    const result = await signInWithPassword(values);
    setSubmitting(false);
    if (result.status === "error") {
      setServerMessage(result.message ?? "Something went wrong.");
    }
  }

  async function onMagicLink() {
    const email = form.getValues("email");
    const parsed = magicLinkSchema.safeParse({ email });
    if (!parsed.success) {
      form.setError("email", { message: "Enter a valid email first" });
      return;
    }
    setSubmitting(true);
    const result = await signInWithMagicLink(parsed.data);
    setSubmitting(false);
    if (result.status === "success") {
      setMagicSent(true);
    } else {
      setServerMessage(result.message ?? "Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      <GoogleButton />

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-outline-variant/25" />
        <span className="label-mono text-on-surface/40">or</span>
        <div className="h-px flex-1 bg-outline-variant/25" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username / Email</FormLabel>
                <FormControl>
                  <Input type="text" autoComplete="username" placeholder="you or you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link href="/auth/reset-password" className="label-mono text-primary/80 hover:text-primary">
                    Forgot?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {serverMessage}
            </p>
          ) : null}
          {magicSent ? (
            <p role="status" className="text-sm text-primary">
              Check your email for a sign-in link.
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" tooltip="Sign in with your email and password" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            tooltip="Get a one-time sign-in link by email"
            onClick={onMagicLink}
            disabled={submitting}
          >
            Email me a magic link
          </Button>
        </form>
      </Form>
    </div>
  );
}
