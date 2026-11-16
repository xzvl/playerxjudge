"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleDashed, ImageIcon, Loader2, Sparkles, XCircle } from "lucide-react";

import { optimizeImage } from "@/app/backend/content/images/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

// Mirrors StoredImage in lib/images/optimize.ts (that module is
// server-only, so the shape is restated here).
interface ImageRow {
  bucket: string;
  path: string;
  url: string;
  size: number;
  updatedAt: string | null;
  isWebp: boolean;
  variants: Record<"thumbnail" | "small" | "medium" | "large", boolean>;
  optimized: boolean;
}

type Filter = "all" | "unoptimized" | "optimized";
type RowStatus = { state: "running" } | { state: "done" } | { state: "error"; message: string };

const SIZE_NAMES = ["small", "thumbnail", "medium", "large"] as const;
const PAGE_SIZE = 50;
const keyOf = (img: { bucket: string; path: string }) => `${img.bucket}/${img.path}`;

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ImageOptimizationPanel({ initialImages, loadError }: { initialImages: ImageRow[]; loadError: string | null }) {
  const [images, setImages] = useState(initialImages);
  const [filter, setFilter] = useState<Filter>("unoptimized");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const cancelRef = useRef(false);

  const counts = useMemo(
    () => ({
      all: images.length,
      optimized: images.filter((i) => i.optimized).length,
      unoptimized: images.filter((i) => !i.optimized).length,
    }),
    [images]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return images.filter((img) => {
      if (filter === "optimized" && !img.optimized) return false;
      if (filter === "unoptimized" && img.optimized) return false;
      return !q || keyOf(img).toLowerCase().includes(q);
    });
  }, [images, filter, query]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, lastPage);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectedInView = filtered.filter((img) => selected.has(keyOf(img)));
  const allSelected = filtered.length > 0 && selectedInView.length === filtered.length;
  const someSelected = selectedInView.length > 0 && !allSelected;

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) filtered.forEach((img) => next.delete(keyOf(img)));
      else filtered.forEach((img) => next.add(keyOf(img)));
      return next;
    });
  }

  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function runOptimization() {
    const queue = filtered.filter((img) => selected.has(keyOf(img)));
    if (queue.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setProgress({ done: 0, total: queue.length, failed: 0 });

    let failed = 0;
    for (let i = 0; i < queue.length; i++) {
      if (cancelRef.current) break;
      const img = queue[i];
      const key = keyOf(img);
      setStatuses((prev) => ({ ...prev, [key]: { state: "running" } }));
      const result = await optimizeImage(img.bucket, img.path);

      if (result.status === "success") {
        const newPath = result.path ?? img.path;
        setImages((prev) =>
          prev.map((row) =>
            keyOf(row) === key
              ? {
                  ...row,
                  path: newPath,
                  url: newPath === row.path ? row.url : row.url.replace(/[^/]+$/, newPath.split("/").pop() ?? ""),
                  isWebp: true,
                  variants: { thumbnail: true, small: true, medium: true, large: true },
                  optimized: true,
                }
              : row
          )
        );
        setStatuses((prev) => ({ ...prev, [keyOf({ bucket: img.bucket, path: newPath })]: { state: "done" } }));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        failed += 1;
        setStatuses((prev) => ({ ...prev, [key]: { state: "error", message: result.message ?? "Failed." } }));
      }
      setProgress({ done: i + 1, total: queue.length, failed });
    }
    setRunning(false);
  }

  if (loadError) {
    return (
      <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-outline-variant/25 bg-surface-container-low p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-on-surface/50" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-[13px] font-medium">Image optimization</h2>
            <p className="text-xs text-on-surface/55">
              Backfills WebP + 4 size variants (small/thumbnail/medium/large) for images uploaded before the optimization pipeline
              existed. &ldquo;Optimized&rdquo; means the original is WebP and all 4 sizes exist.
            </p>
            <p className="text-xs text-on-surface/40">
              {counts.all.toLocaleString()} images · {counts.optimized.toLocaleString()} optimized ·{" "}
              {counts.unoptimized.toLocaleString()} unoptimized
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<Filter>
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: `All (${counts.all})` },
              { value: "unoptimized", label: `Unoptimized (${counts.unoptimized})` },
              { value: "optimized", label: `Optimized (${counts.optimized})` },
            ]}
          />
          <SearchInput
            wrapperClassName="w-full sm:w-64"
            placeholder="Search bucket or path…"
            aria-label="Search images"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <Button type="button" variant="outline" onClick={() => (cancelRef.current = true)}>
              Stop
            </Button>
          ) : null}
          <Button type="button" onClick={runOptimization} disabled={running || selectedInView.length === 0}>
            {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {running ? "Optimizing…" : `Optimize selected (${selectedInView.length})`}
          </Button>
        </div>
      </div>

      {progress ? (
        <div className="space-y-1.5" role="status">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
          <p className="text-xs text-on-surface/55">
            {progress.done} of {progress.total} processed{progress.failed ? ` · ${progress.failed} failed` : ""}
            {!running && progress.done < progress.total ? " · stopped" : ""}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[13px]">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleAll}
            disabled={filtered.length === 0 || running}
            aria-label="Select all"
          />
          Select all {filtered.length > 0 ? `(${filtered.length})` : ""}
        </label>
        <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      </div>

      {pageRows.length === 0 ? (
        <p className="rounded-md border border-dashed border-outline-variant/30 p-8 text-center text-[13px] text-on-surface/50">
          {filter === "unoptimized" && counts.all > 0 ? "Every image is optimized." : "No images match."}
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant/15 rounded-lg border border-outline-variant/25">
          {pageRows.map((img) => {
            const key = keyOf(img);
            const status = statuses[key];
            return (
              <li key={key} className="flex items-center gap-3 px-3 py-2.5">
                <Checkbox
                  checked={selected.has(key)}
                  onChange={() => toggleOne(key)}
                  disabled={running}
                  aria-label={`Select ${img.path}`}
                />
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline-variant/25 bg-surface-container-lowest">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" loading="lazy" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-on-surface">{img.path}</p>
                  <p className="truncate text-xs text-on-surface/45">
                    {img.bucket} · {formatBytes(img.size)} · {img.isWebp ? "WebP" : (img.path.split(".").pop() ?? "").toUpperCase()}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    <SizeChips img={img} />
                  </div>
                </div>
                <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                  <SizeChips img={img} />
                </div>
                <div className="w-24 shrink-0 text-right text-xs">
                  {status?.state === "running" ? (
                    <span className="inline-flex items-center gap-1 text-on-surface/60">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Working
                    </span>
                  ) : status?.state === "error" ? (
                    <span className="inline-flex items-center gap-1 text-destructive" title={status.message}>
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Failed
                    </span>
                  ) : img.optimized ? (
                    <span className="inline-flex items-center gap-1 text-on-surface/70">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Optimized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-on-surface/45">
                      <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" /> Pending
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={currentPage} lastPage={lastPage} onChange={setPage} />
      {images.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-on-surface/45">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> No images found in storage.
        </p>
      ) : null}
    </div>
  );
}

function SizeChips({ img }: { img: ImageRow }) {
  return (
    <>
      {SIZE_NAMES.map((size) => (
        <span
          key={size}
          className={cn(
            "rounded border px-1.5 py-px text-[10px]",
            img.variants[size]
              ? "border-outline-variant/30 text-on-surface/70"
              : "border-dashed border-outline-variant/30 text-on-surface/35"
          )}
        >
          {size}
        </span>
      ))}
    </>
  );
}
