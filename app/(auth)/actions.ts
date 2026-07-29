"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rateLimit } from "@/lib/rate-limit";
import {
  loginSchema,
  registerSchema,
  magicLinkSchema,
  type LoginInput,
  type RegisterInput,
  type MagicLinkInput,
} from "@/lib/validations/auth";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

async function getSiteUrl() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${protocol}://${host}`;
}

async function requestKey(scope: string) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "unknown";
  return `${scope}:${ip}`;
}

const NOT_CONFIGURED_STATE: AuthActionState = {
  status: "error",
  message: "Supabase isn't configured yet. Add your project credentials to .env.local (see README).",
};

export async function signInWithPassword(
  input: LoginInput
): Promise<AuthActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED_STATE;

  const limited = rateLimit(await requestKey("login"), 10, 60_000);
  if (!limited.success) {
    return { status: "error", message: "Too many attempts. Try again in a minute." };
  }

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: "Invalid email or password." };
  }

  redirect("/");
}

export async function signUp(
  input: RegisterInput
): Promise<AuthActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED_STATE;

  const limited = rateLimit(await requestKey("register"), 5, 60_000);
  if (!limited.success) {
    return { status: "error", message: "Too many attempts. Try again in a minute." };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password, displayName, username } = parsed.data;
  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: { display_name: displayName, username },
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "Check your email to verify your account before signing in.",
  };
}

export async function signInWithMagicLink(
  input: MagicLinkInput
): Promise<AuthActionState> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED_STATE;

  const limited = rateLimit(await requestKey("magic-link"), 5, 60_000);
  if (!limited.success) {
    return { status: "error", message: "Too many attempts. Try again in a minute." };
  }

  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Check your email for a sign-in link." };
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    redirect("/login?error=not_configured");
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
