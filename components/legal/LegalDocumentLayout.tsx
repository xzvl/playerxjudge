import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import type { LegalBlock, LegalSection } from "@/lib/legal-content";

import { LegalBlocks } from "./LegalBlocks";

// Shared page shell for /privacy and /terms, matching the /rules layout:
// hero icon + eyebrow + heading, a quick-link row that jumps to each
// section, an optional notice callout, then sections separated by <Separator>.
export function LegalDocumentLayout({
  icon,
  eyebrow,
  title,
  subtitle,
  notice,
  intro,
  sections,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
  notice?: { title: string; body: string };
  intro: LegalBlock[];
  sections: LegalSection[];
}) {
  return (
    <div className="px-4 py-12 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-outline-variant/25 bg-surface-container-low">{icon}</div>
          <p className="label-mono mt-4 text-on-surface/50">{eyebrow}</p>
          <h1 className="heading mt-1 text-2xl md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-4 text-xs text-on-surface/40">{subtitle}</p> : null}
        </div>

        {sections.length > 1 ? (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="label-mono border border-outline-variant/40 px-3 py-2 text-[10px] text-on-surface/60 transition-colors hover:border-primary hover:text-primary"
              >
                {section.title}
              </a>
            ))}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-10 flex gap-3 border border-primary/40 bg-primary/5 p-5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="label-mono text-primary">{notice.title}</p>
              <p className="mt-2 text-sm text-on-surface/70">{notice.body}</p>
            </div>
          </div>
        ) : null}

        {intro.length ? (
          <div className="mt-10">
            <LegalBlocks blocks={intro} />
          </div>
        ) : null}

        {sections.length ? (
          <div className="mt-8 space-y-8">
            {sections.map((section, i) => (
              <div key={section.id}>
                <section id={section.id} className="scroll-mt-24">
                  <h2 className="mb-4 heading text-xl leading-none text-primary">{section.title}</h2>
                  <LegalBlocks blocks={section.blocks} />
                </section>
                {i < sections.length - 1 ? <Separator className="mt-10" /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
