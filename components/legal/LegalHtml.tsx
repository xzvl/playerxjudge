// Renders sanitized rich-text HTML (see legalSections in lib/legal-content.ts)
// with the same type scale the plain-block renderer used.
export function LegalHtml({ html }: { html: string }) {
  if (!html.trim()) return null;
  return (
    <div
      className="text-sm leading-relaxed text-on-surface/70 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_code]:rounded-[2px] [&_code]:bg-surface-container [&_code]:px-1 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-[0.05em] [&_h3]:text-on-surface [&_li]:my-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-3 [&_strong]:text-on-surface [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&>*:first-child]:mt-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
