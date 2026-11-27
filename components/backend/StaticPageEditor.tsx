"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/tournaments/wizard/RichTextEditor";
import { updateStaticPage } from "@/app/backend/static-pages/actions";
import { formatDate } from "@/lib/format";
import { legalBodyToEditorHtml } from "@/lib/legal-content";
import type { StaticPageSlug } from "@/lib/types/database";

export function StaticPageEditor({
  slug,
  initialTitle,
  initialBody,
  updatedAt,
}: {
  slug: StaticPageSlug;
  initialTitle: string;
  initialBody: string;
  updatedAt: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(() => legalBodyToEditorHtml(initialBody));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setMessage(null);
    const result = await updateStaticPage(slug, title, body);
    setSubmitting(false);
    setMessage(
      result.status === "error"
        ? { type: "error", text: result.message ?? "Something went wrong." }
        : { type: "success", text: result.message ?? "Saved." }
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      <p className="text-xs text-on-surface/40">Last updated {formatDate(updatedAt)}</p>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-on-surface">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-on-surface">Body</label>
        <RichTextEditor value={body} onChange={setBody} headings minHeight={420} />
        <p className="text-xs text-on-surface/40">
          Use the section heading button for each titled section. Each one becomes a quick-link at the top of the page.
        </p>
      </div>

      {message ? (
        <p role={message.type === "error" ? "alert" : "status"} className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-primary"}>
          {message.text}
        </p>
      ) : null}

      <Button tooltip="Save this page" disabled={submitting} onClick={handleSave}>
        {submitting ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
