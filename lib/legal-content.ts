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

// ---------------------------------------------------------------------------
// Rich-text (WYSIWYG) bodies. The backend editor stores HTML; older rows still
// hold the markdown-lite format above. `legalSections` accepts either and
// returns sanitized HTML per section, split at each <h2>.
// ---------------------------------------------------------------------------

export type LegalHtmlSection = { id: string; title: string; html: string };

const ALLOWED_TAGS = new Set(["p", "h2", "h3", "ul", "ol", "li", "strong", "b", "em", "i", "u", "br", "a", "blockquote", "code", "hr"]);

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeHref(href: string): string | null {
  const value = href.trim();
  return /^(https?:\/\/|mailto:|\/|#)/i.test(value) ? value : null;
}

// Allowlist sanitizer: drops script/style/comments entirely, keeps only the
// tags the editor produces, strips every attribute except a safe <a href>.
export function sanitizeLegalHtml(html: string): string {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "");
  return cleaned.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g, (_m, slash: string, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (slash) return `</${tag}>`;
    if (tag === "a") {
      const match = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
      const href = match ? safeHref((match[1] ?? match[2] ?? "").replace(/&amp;/g, "&")) : null;
      return href ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">` : "<a>";
    }
    return `<${tag}>`;
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function blocksToHtml(blocks: LegalBlock[]): string {
  return blocks
    .map((b) => (b.type === "list" ? `<ul>${b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>` : `<p>${escapeHtml(b.text)}</p>`))
    .join("");
}

export function legalSections(body: string): { introHtml: string; sections: LegalHtmlSection[] } {
  const isHtml = /^\s*</.test(body);
  if (!isHtml) {
    const { intro, sections } = parseLegalBody(body);
    return {
      introHtml: blocksToHtml(intro),
      sections: sections.map((s) => ({ id: s.id, title: s.title, html: blocksToHtml(s.blocks) })),
    };
  }

  const safe = sanitizeLegalHtml(body);
  const parts = safe.split(/<h2>([\s\S]*?)<\/h2>/i);
  // parts = [intro, title1, html1, title2, html2, ...]
  const sections: LegalHtmlSection[] = [];
  const used = new Set<string>();
  for (let i = 1; i < parts.length; i += 2) {
    const title = stripTags(parts[i]);
    let id = slugify(title) || `section-${sections.length + 1}`;
    while (used.has(id)) id = `${id}-${sections.length + 1}`;
    used.add(id);
    sections.push({ id, title, html: parts[i + 1] ?? "" });
  }
  return { introHtml: parts[0] ?? "", sections };
}

// Body as editor HTML: legacy markdown-lite rows are converted so the WYSIWYG
// editor opens them with their sections and lists intact.
export function legalBodyToEditorHtml(body: string): string {
  if (/^\s*</.test(body)) return body;
  const { introHtml, sections } = legalSections(body);
  return introHtml + sections.map((s) => `<h2>${escapeHtml(s.title)}</h2>${s.html}`).join("");
}
