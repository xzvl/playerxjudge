"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rateLimit } from "@/lib/rate-limit";
import { magicLinkSchema, resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import type { AuthActionState } from "@/app/(auth)/actions";

const NOT_CONFIGURED_STATE: AuthActionState = {
  status: "error",
  message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README).",
};

export async function requestPasswordReset(email: string): Promise<AuthActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED_STATE;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "unknown";
  const limited = rateLimit(`reset:${ip}`, 5, 60_000);
  if (!limited.success) {
    return { status: "error", message: "Too many attempts. Try again in a minute." };
  }

  const parsed = magicLinkSchema.safeParse({ email });
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?redirectTo=/auth/reset-password`,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Check your email for a password reset link." };
}

export async function updatePassword(input: ResetPasswordInput): Promise<AuthActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED_STATE;

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Password updated. You can now sign in." };
}
