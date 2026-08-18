import type { LegalBlock } from "@/lib/legal-content";

// Renders the paragraph/list blocks produced by lib/legal-content.ts, styled
// to match the RuleList look on /rules.
export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-inside list-disc space-y-2 text-sm text-on-surface/70">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-sm leading-relaxed text-on-surface/70">
            {block.text}
          </p>
        )
      )}
    </div>
  );
}
