"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

import {
  ColorField,
  EditorCard,
  LinksEditor,
  SaveBar,
  SiteAssetField,
  TextAreaField,
  TextField,
  useSectionEditor,
} from "@/components/backend/content/shared";
import { HeroView } from "@/components/home/HeroView";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SortableList } from "@/components/ui/sortable-list";
import {
  SOCIAL_PLATFORMS,
  formatCopyright,
  newId,
  type BrandingContent,
  type FooterContent,
  type HeaderContent,
  type HeroContent,
  type MaintenanceContent,
  type SocialPlatform,
  type ThemeColors,
} from "@/lib/site-content/schema";

// ------------------------------------------------------------------
// Branding
// ------------------------------------------------------------------

export function BrandingEditor({ initial }: { initial: BrandingContent }) {
  const editor = useSectionEditor("branding", initial);
  const { value, setValue } = editor;
  const set = (patch: Partial<BrandingContent>) => setValue({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <EditorCard title="Logo" description="Replaces the PlayerXJudge wordmark in the header, footer and dashboards.">
          <SiteAssetField
            slot="logo"
            label="Logo (dark mode)"
            hint="Shown on the dark theme, and on the light theme when there's no alternative. SVG or a wide PNG/WebP works best."
            value={value.logoUrl}
            onChange={(logoUrl) => set({ logoUrl })}
            previewClassName="w-48 bg-[#0a0a0b]"
          />
          <SiteAssetField
            slot="logo"
            label="Alternative logo (light mode)"
            hint="Shown on the light theme."
            value={value.logoAltUrl}
            onChange={(logoAltUrl) => set({ logoAltUrl })}
            previewClassName="w-48 bg-white"
          />
        </EditorCard>

        <EditorCard title="Favicon" description="The small icon in browser tabs and bookmarks.">
          <SiteAssetField
            slot="favicon"
            label="Favicon"
            hint="Square PNG, SVG or ICO, at least 48×48."
            value={value.faviconUrl}
            onChange={(faviconUrl) => set({ faviconUrl })}
            previewClassName="h-16 w-16 bg-white"
            keepFormat
            maxDimension={512}
          />
          <SiteAssetField
            slot="favicon"
            label="Alternative favicon"
            hint="Used when the visitor's browser is in dark mode. Falls back to the favicon."
            value={value.faviconAltUrl}
            onChange={(faviconAltUrl) => set({ faviconAltUrl })}
            previewClassName="h-16 w-16 bg-[#0a0a0b]"
            keepFormat
            maxDimension={512}
          />
        </EditorCard>
      </div>

      <EditorCard title="Contact">
        <TextField
          id="branding-email"
          label="Email"
          type="email"
          value={value.email}
          onChange={(email) => set({ email })}
          placeholder="hello@example.com"
          hint="Shown in the footer, on the maintenance page and in the sponsor instructions."
        />
      </EditorCard>

      <SaveBar onSave={editor.save} onReset={editor.reset} pending={editor.pending} dirty={editor.dirty} message={editor.message} />
    </div>
  );
}

// ------------------------------------------------------------------
// Header
// ------------------------------------------------------------------

export function HeaderEditor({ initial }: { initial: HeaderContent }) {
  const editor = useSectionEditor("header", initial);
  const { value, setValue } = editor;

  return (
    <div className="space-y-5">
      <EditorCard
        title="Navigation links"
        description="The main menu: inline in the header on wide screens, and in the menu panel on every screen (after Home and Dashboard)."
      >
        <LinksEditor links={value.links} onChange={(links) => setValue({ ...value, links })} />
      </EditorCard>
      <SaveBar onSave={editor.save} onReset={editor.reset} pending={editor.pending} dirty={editor.dirty} message={editor.message} />
    </div>
  );
}

// ------------------------------------------------------------------
// Hero
// ------------------------------------------------------------------

function ThemeColorsEditor({
  mode,
  colors,
  onChange,
  hero,
}: {
  mode: "dark" | "light";
  colors: ThemeColors;
  onChange: (colors: ThemeColors) => void;
  hero: HeroContent;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const title = mode === "dark" ? "Dark mode" : "Light mode";

  return (
    <EditorCard title={title} description="Leave a color empty to use the site theme.">
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField
          id={`hero-${mode}-bg`}
          label="Background color"
          value={colors.background}
          onChange={(background) => onChange({ ...colors, background })}
        />
        <ColorField id={`hero-${mode}-text`} label="Text color" value={colors.text} onChange={(text) => onChange({ ...colors, text })} />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
        {showPreview ? <EyeOff /> : <Eye />} {showPreview ? "Hide preview" : "Show preview"}
      </Button>
      {showPreview ? (
        <div className="pointer-events-none overflow-hidden rounded-md" aria-label={`${title} preview`}>
          <HeroView hero={hero} preview={mode} />
        </div>
      ) : null}
    </EditorCard>
  );
}

export function HeroEditor({ initial }: { initial: HeroContent }) {
  const editor = useSectionEditor("hero", initial);
  const { value, setValue } = editor;
  const set = (patch: Partial<HeroContent>) => setValue({ ...value, ...patch });

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <EditorCard title="Text">
          <TextField id="hero-tag" label="Tag" value={value.tag} onChange={(tag) => set({ tag })} maxLength={120} hint="Small line above the title." />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="hero-title" label="Title" value={value.title} onChange={(title) => set({ title })} maxLength={120} />
            <TextField
              id="hero-title-red"
              label="Title (red)"
              value={value.titleRed}
              onChange={(titleRed) => set({ titleRed })}
              maxLength={120}
              hint="Second line, in the brand red."
            />
          </div>
          <TextAreaField id="hero-content" label="Content" value={value.content} onChange={(content) => set({ content })} rows={4} maxLength={1000} />
        </EditorCard>

        <EditorCard title="Buttons" description="Leave a label empty to hide that button.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="hero-primary-label"
              label="Button label"
              value={value.primaryLabel}
              onChange={(primaryLabel) => set({ primaryLabel })}
              maxLength={60}
            />
            <TextField
              id="hero-primary-link"
              label="Button link"
              value={value.primaryHref}
              onChange={(primaryHref) => set({ primaryHref })}
              placeholder="/tournaments"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="hero-secondary-label"
              label="Second button label"
              value={value.secondaryLabel}
              onChange={(secondaryLabel) => set({ secondaryLabel })}
              maxLength={60}
            />
            <TextField
              id="hero-secondary-link"
              label="Second button link"
              value={value.secondaryHref}
              onChange={(secondaryHref) => set({ secondaryHref })}
              placeholder="/become/organizer"
            />
          </div>
        </EditorCard>
      </div>

      <EditorCard title="Image" description="Fills the panel beside the text. Without one, the default artwork shows.">
        <SiteAssetField
          slot="hero"
          label="Hero image"
          hint="Landscape, around 1600×1200. JPG and PNG are converted to WebP."
          value={value.imageUrl}
          onChange={(imageUrl) => set({ imageUrl })}
          previewClassName="h-24 w-36"
          maxDimension={1920}
        />
      </EditorCard>

      <div className="grid gap-5 2xl:grid-cols-2">
        <ThemeColorsEditor mode="dark" colors={value.dark} onChange={(dark) => set({ dark })} hero={value} />
        <ThemeColorsEditor mode="light" colors={value.light} onChange={(light) => set({ light })} hero={value} />
      </div>

      <SaveBar onSave={editor.save} onReset={editor.reset} pending={editor.pending} dirty={editor.dirty} message={editor.message} />
    </div>
  );
}

// ------------------------------------------------------------------
// Footer
// ------------------------------------------------------------------

export function FooterEditor({ initial }: { initial: FooterContent }) {
  const editor = useSectionEditor("footer", initial);
  const { value, setValue } = editor;
  const set = (patch: Partial<FooterContent>) => setValue({ ...value, ...patch });
  const updateSocial = (id: string, patch: Partial<FooterContent["socials"][number]>) =>
    set({ socials: value.socials.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  return (
    <div className="space-y-5">
      <EditorCard title="Navigation links" description="Grouped into footer columns by the Column name, in the order shown.">
        <LinksEditor links={value.links} onChange={(links) => set({ links })} withGroup />
      </EditorCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <EditorCard title="Social links" description="Icons under the logo.">
          {value.socials.length === 0 ? (
            <p className="rounded-md border border-dashed border-outline-variant/30 p-4 text-center text-[13px] text-on-surface/50">
              No social links yet.
            </p>
          ) : (
            <SortableList
              items={value.socials}
              getKey={(s) => s.id}
              onReorder={(socials) => set({ socials })}
              renderItem={(s) => (
                <div className="grid gap-2 sm:grid-cols-[9rem_1fr_auto]">
                  <NativeSelect
                    aria-label="Platform"
                    value={s.platform}
                    onChange={(e) => updateSocial(s.id, { platform: e.target.value as SocialPlatform })}
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input aria-label="URL" placeholder="https://…" value={s.url} onChange={(e) => updateSocial(s.id, { url: e.target.value })} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove social link"
                    onClick={() => set({ socials: value.socials.filter((x) => x.id !== s.id) })}
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
            onClick={() => set({ socials: [...value.socials, { id: newId("social"), platform: "facebook", url: "" }] })}
          >
            <Plus /> Add social link
          </Button>
          <TextAreaField
            id="footer-note"
            label="Note under the icons"
            value={value.note}
            onChange={(note) => set({ note })}
            rows={3}
            maxLength={400}
          />
        </EditorCard>

        <EditorCard title="Bottom bar">
          <TextField
            id="footer-copyright"
            label="Copyright text"
            value={value.copyright}
            onChange={(copyright) => set({ copyright })}
            maxLength={200}
            hint={
              <>
                <code className="font-mono">{"{year}"}</code> becomes the current year. Preview: {formatCopyright(value.copyright) || "—"}
              </>
            }
          />
          <TextField
            id="footer-tagline"
            label="Tagline"
            value={value.tagline}
            onChange={(tagline) => set({ tagline })}
            maxLength={200}
            hint="Shown on the right of the bottom bar."
          />
        </EditorCard>
      </div>

      <SaveBar onSave={editor.save} onReset={editor.reset} pending={editor.pending} dirty={editor.dirty} message={editor.message} />
    </div>
  );
}

// ------------------------------------------------------------------
// Maintenance mode
// ------------------------------------------------------------------

export function MaintenanceEditor({ initial }: { initial: MaintenanceContent }) {
  const editor = useSectionEditor("maintenance", initial);
  const { value, setValue } = editor;
  const set = (patch: Partial<MaintenanceContent>) => setValue({ ...value, ...patch });
  const liveEnabled = editor.dirty ? initial.enabled : value.enabled;

  return (
    <div className="space-y-5">
      <EditorCard
        title="Status"
        description="While on, visitors see the maintenance page instead of the site. Staff still see everything, and /backend and sign-in stay open."
      >
        <label className="flex items-start gap-3">
          <Checkbox checked={value.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="mt-0.5" />
          <span>
            <span className="block text-[13px] font-medium">Maintenance mode</span>
            <span className="block text-xs text-on-surface/50">
              {value.enabled ? "The public site will be replaced by the maintenance page." : "The site is open to everyone."}
            </span>
          </span>
        </label>
        <p className="text-xs text-on-surface/50">
          Currently: <span className="font-medium text-on-surface">{liveEnabled ? "On" : "Off"}</span>
          {editor.dirty ? " (save to apply your change)" : null}
        </p>
      </EditorCard>

      <EditorCard title="Maintenance page">
        <TextField id="maintenance-title" label="Title" value={value.title} onChange={(title) => set({ title })} maxLength={120} />
        <TextAreaField
          id="maintenance-message"
          label="Message"
          value={value.message}
          onChange={(message) => set({ message })}
          rows={4}
          maxLength={2000}
        />
      </EditorCard>

      <SaveBar onSave={editor.save} onReset={editor.reset} pending={editor.pending} dirty={editor.dirty} message={editor.message} />
    </div>
  );
}
