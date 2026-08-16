import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { getStaticPage } from "@/lib/static-pages";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PlayerXJudge collects, uses, and protects your data.",
};

export default async function PrivacyPage() {
  const page = await getStaticPage("privacy-policy");

  return (
    <div className="cyber-grid px-4 py-20 md:px-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="glass-panel mx-auto flex h-16 w-16 items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <p className="label-mono mt-6 text-primary">Legal</p>
          <h1 className="heading mt-3 text-4xl md:text-5xl">{page.title}</h1>
          <p className="mt-4 text-xs text-on-surface/40">Last updated {formatDate(page.updated_at)}</p>
        </div>

        <div className="mt-12 space-y-4 text-sm leading-relaxed text-on-surface/70">
          {page.body.split(/\n{2,}/).map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
