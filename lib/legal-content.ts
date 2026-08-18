// Markdown-lite parser for the Privacy Policy / Terms & Conditions bodies
// stored in `static_pages.body` (see 20250101000047_faq_and_legal_content.sql
// for the seed content and the format convention). Kept intentionally tiny —
// three constructs only:
//   "## Heading"  -> starts a new section, id = slugified heading
//   "- item"      -> a bullet list item
//   blank line    -> paragraph break
// Anything before the first "## " heading is returned as `intro`. Used by
// components/legal/LegalDocumentLayout.tsx to render /privacy and /terms
// with the same section/quick-link look as /rules.

export type LegalBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function parseLegalBody(body: string): { intro: LegalBlock[]; sections: LegalSection[] } {
  const sections: LegalSection[] = [];
  const intro: LegalBlock[] = [];
  const usedIds = new Set<string>();

  let current: LegalSection | null = null;
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const target = () => (current ? current.blocks : intro);

  function flushParagraph() {
    const text = paragraphLines.join(" ").trim();
    if (text) target().push({ type: "paragraph", text });
    paragraphLines = [];
  }

  function flushList() {
    if (listItems.length) target().push({ type: "list", items: listItems });
    listItems = [];
  }

  for (const rawLine of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      const title = line.slice(3).trim();
      let id = slugify(title) || `section-${sections.length + 1}`;
      while (usedIds.has(id)) id = `${id}-${sections.length + 1}`;
      usedIds.add(id);
      current = { id, title, blocks: [] };
      sections.push(current);
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }
  flushParagraph();
  flushList();

  return { intro, sections };
}
