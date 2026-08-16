"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";
import type { StaticPageSlug } from "@/lib/types/database";

const PUBLIC_PATH: Record<StaticPageSlug, string> = {
  "privacy-policy": "/privacy",
  "terms-of-service": "/terms",
  "how-to-use": "/how-to-use",
};

// The /backend route names don't all match their slug 1:1 (Terms lives at
// /backend/terms, not /backend/terms-of-service — see app/backend/layout.tsx).
const BACKEND_PATH: Record<StaticPageSlug, string> = {
  "privacy-policy": "/backend/privacy-policy",
  "terms-of-service": "/backend/terms",
  "how-to-use": "/backend/how-to-use",
};

// Backs the Privacy Policy / Terms / How to Use editors — all three static
// pages share this one action, keyed by slug (see
// 20250101000037_backend_admin.sql). RLS ("static_pages_write_admin") is
// admin-only.
export async function updateStaticPage(slug: StaticPageSlug, title: string, body: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!title.trim()) return { status: "error", message: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("static_pages")
    .update({ title: title.trim(), body, updated_by: user.id })
    .eq("slug", slug);
  if (error) return { status: "error", message: error.message };

  revalidatePath(BACKEND_PATH[slug]);
  revalidatePath(PUBLIC_PATH[slug]);
  return { status: "success", message: "Saved." };
}
