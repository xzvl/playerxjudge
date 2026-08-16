import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions about PlayerXJudge tournaments, subscriptions, and accounts.",
};

const UNCATEGORIZED = "General";

export default async function FaqsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("faqs").select("*").eq("is_published", true).order("sort_order").order("created_at");

  const faqs = (data as Faq[] | null) ?? [];
  const byCategory = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const category = faq.category?.trim() || UNCATEGORIZED;
    const list = byCategory.get(category) ?? [];
    list.push(faq);
    byCategory.set(category, list);
  }

  return (
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <HelpCircle className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Help</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">Frequently Asked Questions</h1>
        </div>

        {byCategory.size === 0 ? (
          <p className="mt-12 text-center text-sm text-on-surface/50">No FAQs published yet — check back soon.</p>
        ) : (
          <div className="mt-12 space-y-10">
            {[...byCategory.entries()].map(([category, items]) => (
              <div key={category}>
                <h2 className="label-mono mb-4 text-primary">{category}</h2>
                <div className="space-y-6">
                  {items.map((faq) => (
                    <div key={faq.id} className="border border-outline-variant/25 bg-surface-container-low p-5">
                      <p className="font-medium text-on-surface">{faq.question}</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-on-surface/60">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
