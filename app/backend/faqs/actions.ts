"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/get-user";
import type { RoleActionState } from "@/lib/validations/roles";

function revalidateFaqPaths() {
  revalidatePath("/backend/faqs");
  revalidatePath("/faqs");
}

export interface FaqInput {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export async function createFaq(input: FaqInput): Promise<RoleActionState & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!input.question.trim() || !input.answer.trim()) return { status: "error", message: "Question and answer are required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faqs")
    .insert({
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category.trim() || null,
      sort_order: input.sortOrder,
      is_published: input.isPublished,
    })
    .select("id")
    .single();
  if (error) return { status: "error", message: error.message };

  revalidateFaqPaths();
  return { status: "success", id: data.id };
}

export async function updateFaq(id: string, input: FaqInput): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };
  if (!input.question.trim() || !input.answer.trim()) return { status: "error", message: "Question and answer are required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("faqs")
    .update({
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category.trim() || null,
      sort_order: input.sortOrder,
      is_published: input.isPublished,
    })
    .eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateFaqPaths();
  return { status: "success" };
}

export async function togglePublishFaq(id: string, isPublished: boolean): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("faqs").update({ is_published: isPublished }).eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateFaqPaths();
  return { status: "success" };
}

export async function deleteFaq(id: string): Promise<RoleActionState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { status: "error", message: error.message };

  revalidateFaqPaths();
  return { status: "success" };
}
