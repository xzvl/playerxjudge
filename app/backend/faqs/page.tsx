import type { Metadata } from "next";

import { FaqsPanel, type FaqItem } from "@/components/backend/FaqsPanel";
import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/lib/types/database";

export const metadata: Metadata = { title: "FAQs", robots: { index: false, follow: false } };

export default async function BackendFaqsPage() {
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
    <div>
      <p className="label-mono text-primary">Backend</p>
      <h1 className="heading mt-2 text-3xl">FAQs</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">Manage the frequently asked questions shown on the public FAQs page.</p>
      <div className="mt-8">
        <FaqsPanel faqs={faqs} />
      </div>
    </div>
  );
}
