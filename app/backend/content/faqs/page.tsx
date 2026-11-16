import type { Metadata } from "next";

import { FaqsPanel, type FaqItem } from "@/components/backend/FaqsPanel";
import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/lib/types/database";

export const metadata: Metadata = { title: "Content: FAQs", robots: { index: false, follow: false } };

export default async function BackendContentFaqsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("*").order("sort_order").order("created_at");

  const faqs: FaqItem[] = ((data as Faq[] | null) ?? []).map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category,
    sortOrder: f.sort_order,
    isPublished: f.is_published,
  }));

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-on-surface/55">The questions shown on the public FAQs page.</p>
      <FaqsPanel faqs={faqs} />
    </div>
  );
}
