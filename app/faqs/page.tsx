import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import type { Faq } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Frequently asked questions about PlayerXJudge tournaments, subscriptions, and accounts.",
};

const UNCATEGORIZED = "General";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
  const categories = [...byCategory.entries()].map(([category, items]) => ({
    id: slugify(category),
    category,
    items,
  }));

  return (
    <div className="px-4 py-12 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">
            <HelpCircle className="h-4 w-4 text-on-surface/70" aria-hidden="true" />
          </div>
          <p className="label-mono mt-4 text-on-surface/50">Help</p>
          <h1 className="heading mt-1 text-2xl md:text-3xl">Frequently Asked Questions</h1>
          <p className="mx-auto mt-4 max-w-xl text-on-surface/60">
            Answers about registering for tournaments, judging, communities, decks, roles, and your account.
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="mt-8 text-center text-sm text-on-surface/50">No FAQs published yet — check back soon.</p>
        ) : (
          <>
            {categories.length > 1 ? (
              <div className="mt-10 flex flex-wrap justify-center gap-2">
                {categories.map(({ id, category }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="label-mono border border-outline-variant/40 px-3 py-2 text-[10px] text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
                  >
                    {category}
                  </a>
                ))}
              </div>
            ) : null}

            <div className="mt-8 space-y-8">
              {categories.map(({ id, category, items }, i) => (
                <div key={id}>
                  <section id={id} className="scroll-mt-24">
                    <h2 className="mb-4 heading text-xl leading-none text-primary">{category}</h2>
                    <div className="space-y-4">
                      {items.map((faq) => (
                        <div key={faq.id} className="border border-outline-variant/25 bg-surface-container-low p-5">
                          <p className="font-medium text-on-surface">{faq.question}</p>
                          <p className="mt-2 whitespace-pre-line text-sm text-on-surface/60">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                  {i < categories.length - 1 ? <Separator className="mt-10" /> : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
