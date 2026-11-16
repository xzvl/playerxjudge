"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { ImageIcon, Plus, Trash2, Upload } from "lucide-react";

import { saveSiteSection, uploadSiteAsset } from "@/app/backend/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SortableList } from "@/components/ui/sortable-list";
import { fileToWebp } from "@/lib/images/to-webp";
import { newId, type LinkTarget, type NavLink, type SiteContent, type SiteSectionKey } from "@/lib/site-content/schema";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------
// Section card + save
// ------------------------------------------------------------------

export function EditorCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-outline-variant/25 bg-surface-container-low", className)}>
      <header className="border-b border-outline-variant/20 px-4 py-3">
        <h2 className="text-[13px] font-medium">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-on-surface/50">{description}</p> : null}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

// Holds a section's draft and saves it. `dirty` compares against the last
// saved value so the Save button only lights up when something changed.
export function useSectionEditor<K extends SiteSectionKey>(key: K, initial: SiteContent[K]) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveSiteSection(key, value);
      if (result.status === "error") {
        setMessage({ type: "error", text: result.message ?? "Couldn't save." });
        return;
      }
      const stored = (result.value ?? value) as SiteContent[K];
      setValue(stored);
      setSaved(stored);
      setMessage({ type: "success", text: result.message ?? "Saved." });
    });

  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  return { value, setValue, save, pending, dirty, message, reset: () => setValue(saved) };
}

export function SaveBar({
  onSave,
  onReset,
  pending,
  dirty,
  message,
}: {
  onSave: () => void;
  onReset: () => void;
  pending: boolean;
  dirty: boolean;
  message: { type: "error" | "success"; text: string } | null;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/20 bg-background/95 px-4 py-3 lg:-mx-6 lg:px-6">
      {message ? (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={cn("mr-auto text-[13px]", message.type === "error" ? "text-destructive" : "text-on-surface/60")}
        >
          {message.text}
        </p>
      ) : dirty ? (
        <p className="mr-auto text-[13px] text-on-surface/50">Unsaved changes</p>
      ) : null}
      <Button type="button" variant="outline" onClick={onReset} disabled={pending || !dirty}>
        Discard
      </Button>
      <Button type="button" onClick={onSave} disabled={pending || !dirty}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------
// Fields
// ------------------------------------------------------------------

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      {hint ? <p className="text-xs text-on-surface/50">{hint}</p> : null}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-outline-variant/35 bg-surface-container-lowest px-2.5 py-2 text-[13px] text-on-surface placeholder:text-on-surface/40 focus-visible:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
      />
    </div>
  );
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Color picker + hex input. Empty = "use the theme default".
export function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  const swatch = HEX.test(value) ? (value.length === 4 ? `#${[...value.slice(1)].map((c) => c + c).join("")}` : value) : "#000000";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={swatch}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value);
          }}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-outline-variant/35 bg-transparent p-0.5"
        />
        <Input
          id={id}
          value={text}
          placeholder="Theme default"
          maxLength={7}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            if (next === "" || HEX.test(next)) onChange(next);
          }}
          className="font-mono"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setText("");
              onChange("");
            }}
          >
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Image upload into the site-assets bucket
// ------------------------------------------------------------------

const RAW_TYPES = ["image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon", "image/webp"];
const CONVERTIBLE = ["image/png", "image/jpeg"];

export function SiteAssetField({
  slot,
  label,
  hint,
  value,
  onChange,
  previewClassName,
  keepFormat = false,
  maxDimension = 1600,
}: {
  // Folder in the bucket (e.g. "logo", "favicon", "hero").
  slot: string;
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (url: string) => void;
  previewClassName?: string;
  // Upload PNGs as-is (favicons) instead of converting them to WebP.
  keepFormat?: boolean;
  maxDimension?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (![...RAW_TYPES, ...CONVERTIBLE].includes(file.type)) {
      setError("Use a PNG, JPG, WebP, SVG or ICO file.");
      return;
    }
    setBusy(true);
    try {
      let upload: File = file;
      if (CONVERTIBLE.includes(file.type) && !keepFormat) {
        const blob = await fileToWebp(file, maxDimension, 0.88);
        upload = new File([blob], "image.webp", { type: "image/webp" });
      }
      if (upload.size > 1024 * 1024) {
        setError("File must be 1 MB or smaller after conversion.");
        return;
      }
      const formData = new FormData();
      formData.set("file", upload);
      const result = await uploadSiteAsset(slot, formData);
      if (result.status === "error" || !result.url) {
        setError(result.message ?? "Upload failed.");
        return;
      }
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium">{label}</p>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline-variant/30 bg-surface-container-lowest",
            previewClassName
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain p-1.5" />
          ) : (
            <ImageIcon className="h-4 w-4 text-on-surface/30" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleFile(file);
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload /> {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange("")}>
              <Trash2 /> Remove
            </Button>
          ) : null}
        </div>
      </div>
      {hint ? <p className="text-xs text-on-surface/50">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------
// Link list (header / footer navigation)
// ------------------------------------------------------------------

export function LinksEditor({
  links,
  onChange,
  withGroup = false,
  addLabel = "Add link",
}: {
  links: NavLink[];
  onChange: (links: NavLink[]) => void;
  // Footer: each link names the column it sits under.
  withGroup?: boolean;
  addLabel?: string;
}) {
  const update = (id: string, patch: Partial<NavLink>) => onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const lastGroup = links[links.length - 1]?.group ?? "";

  return (
    <div className="space-y-2">
      {links.length === 0 ? (
        <p className="rounded-md border border-dashed border-outline-variant/30 p-4 text-center text-[13px] text-on-surface/50">No links yet.</p>
      ) : (
        <SortableList
          items={links}
          getKey={(l) => l.id}
          onReorder={onChange}
          renderItem={(l) => (
            <div className={cn("grid gap-2", withGroup ? "sm:grid-cols-[1fr_1.4fr_1fr_8rem_auto]" : "sm:grid-cols-[1fr_1.6fr_8rem_auto]")}>
              <Input aria-label="Label" placeholder="Label" value={l.label} maxLength={80} onChange={(e) => update(l.id, { label: e.target.value })} />
              <Input aria-label="Link" placeholder="/page or https://…" value={l.href} onChange={(e) => update(l.id, { href: e.target.value })} />
              {withGroup ? (
                <Input
                  aria-label="Column"
                  placeholder="Column"
                  value={l.group ?? ""}
                  maxLength={40}
                  onChange={(e) => update(l.id, { group: e.target.value })}
                />
              ) : null}
              <NativeSelect aria-label="Target" value={l.target} onChange={(e) => update(l.id, { target: e.target.value as LinkTarget })}>
                <option value="_self">Same tab</option>
                <option value="_blank">New tab</option>
              </NativeSelect>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${l.label || "link"}`}
                onClick={() => onChange(links.filter((x) => x.id !== l.id))}
              >
                <Trash2 />
              </Button>
            </div>
          )}
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([...links, { id: newId("link"), label: "", href: "", target: "_self", ...(withGroup ? { group: lastGroup } : {}) }])
        }
      >
        <Plus /> {addLabel}
      </Button>
      <p className="text-xs text-on-surface/50">
        Drag the handle (or use the arrows) to reorder. Links without a label or URL are dropped when you save.
      </p>
    </div>
  );
}
