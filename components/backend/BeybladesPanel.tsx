"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { BeybladeTypeBadge } from "@/components/backend/beyblade-badges";
import { BulkAddBeybladesDialog } from "@/components/backend/BulkAddBeybladesDialog";
import { deleteBeyblade } from "@/app/backend/beyblades/actions";
import {
  BEYBLADE_CATEGORY_LABELS,
  BEYBLADE_CATEGORY_OPTIONS,
  BEYBLADE_SYSTEM_LINE_LABELS,
  BEYBLADE_TYPE_OPTIONS,
} from "@/lib/validations/beyblade";
import { cn } from "@/lib/utils";
import type { BeybladeCategory, BeybladeSystemLine, BeybladeType } from "@/lib/types/database";

export interface BeybladeItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: BeybladeType;
  systemLine: BeybladeSystemLine;
  category: BeybladeCategory;
}

type SortKey = "code" | "name" | "shortName" | "type" | "systemLine" | "category";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="p-4" scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          "label-mono flex items-center gap-1.5 transition-colors hover:text-on-surface",
          active ? "text-primary" : "text-on-surface/40"
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}

export function BeybladesPanel({ beyblades }: { beyblades: BeybladeItem[] }) {
  const [rows, setRows] = useState(beyblades);
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<BeybladeItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((b) => {
      if (types.length > 0 && !types.includes(b.type)) return false;
      if (categories.length > 0 && !categories.includes(b.category)) return false;
      if (q && !b.code.toLowerCase().includes(q) && !b.name.toLowerCase().includes(q) && !b.shortName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, types, categories]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "code":
          return a.code.localeCompare(b.code) * dir;
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "shortName":
          return a.shortName.localeCompare(b.shortName) * dir;
        case "type":
          return a.type.localeCompare(b.type) * dir;
        case "systemLine":
          return a.systemLine.localeCompare(b.systemLine) * dir;
        case "category":
          return a.category.localeCompare(b.category) * dir;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBeyblade(deleting.id);
      if (result.status === "error") {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleting.id));
      setDeleting(null);
    });
  }

  function handleBulkAdded(added: BeybladeItem[]) {
    setRows((prev) => [...added, ...prev]);
  }

  function rowActions(b: BeybladeItem) {
    return (
      <>
        <Button variant="outline" size="icon" asChild tooltip="Edit this beyblade">
          <Link href={`/backend/beyblades/${b.id}`} aria-label={`Edit ${b.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          tooltip="Remove this beyblade"
          aria-label={`Remove ${b.name}`}
          disabled={pending}
          onClick={() => setDeleting(b)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            className="w-full sm:w-64"
            placeholder="Search code, name, short name..."
            aria-label="Search beyblades"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <MultiSelectFilter label="Types" options={BEYBLADE_TYPE_OPTIONS} selected={types} onChange={setTypes} />
          <MultiSelectFilter label="Categories" options={BEYBLADE_CATEGORY_OPTIONS} selected={categories} onChange={setCategories} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" tooltip="Add several beyblades at once" onClick={() => setBulkAddOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> Bulk Add
          </Button>
          <Button asChild className="gap-1.5" tooltip="Add a new beyblade">
            <Link href="/backend/beyblades/new">
              <Plus className="h-3.5 w-3.5" /> Add Beyblade
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {sorted.length > 0 ? (
        <>
          {/* Below lg: one card per beyblade. */}
          <div className="flex flex-col gap-3 lg:hidden">
            {sorted.map((b) => (
              <article key={b.id} className="border border-outline-variant/25 bg-surface-container-low p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="label-mono text-[10px] text-on-surface/40">{b.code}</p>
                    <p className="truncate font-medium text-on-surface">{b.name}</p>
                    <p className="truncate text-sm text-on-surface/50">{b.shortName}</p>
                  </div>
                  <BeybladeTypeBadge type={b.type} />
                </div>
                <p className="mt-2 text-sm text-on-surface/60">
                  {BEYBLADE_SYSTEM_LINE_LABELS[b.systemLine]} <span className="text-on-surface/30">|</span>{" "}
                  {BEYBLADE_CATEGORY_LABELS[b.category]}
                </p>
                <div className="mt-3 flex gap-2">{rowActions(b)}</div>
              </article>
            ))}
          </div>

          {/* lg and up: the full table. */}
          <div className="hidden overflow-x-auto border border-outline-variant/25 lg:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="label-mono border-b border-outline-variant/25 text-on-surface/40">
                  <SortableHeader label="Code" sortKey="code" active={sortKey === "code"} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Name" sortKey="name" active={sortKey === "name"} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Short Name" sortKey="shortName" active={sortKey === "shortName"} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Type" sortKey="type" active={sortKey === "type"} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="System Line" sortKey="systemLine" active={sortKey === "systemLine"} dir={sortDir} onClick={toggleSort} />
                  <SortableHeader label="Category" sortKey="category" active={sortKey === "category"} dir={sortDir} onClick={toggleSort} />
                  <th className="p-4" scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => (
                  <tr key={b.id} className="border-b border-outline-variant/15 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-4 font-mono text-xs text-on-surface/60">{b.code}</td>
                    <td className="p-4 font-medium text-on-surface">{b.name}</td>
                    <td className="p-4 text-on-surface/60">{b.shortName}</td>
                    <td className="p-4">
                      <BeybladeTypeBadge type={b.type} />
                    </td>
                    <td className="p-4 text-on-surface/60">{BEYBLADE_SYSTEM_LINE_LABELS[b.systemLine]}</td>
                    <td className="p-4 text-on-surface/60">{BEYBLADE_CATEGORY_LABELS[b.category]}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">{rowActions(b)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="border border-outline-variant/25 bg-surface-container-low p-8 text-center text-sm text-on-surface/50">
          {beyblades.length === 0 ? "No beyblades in the catalog yet." : "No beyblades match your filters."}
        </p>
      )}

      <BulkAddBeybladesDialog open={bulkAddOpen} onOpenChange={setBulkAddOpen} onAdded={handleBulkAdded} />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>This permanently deletes this beyblade from the catalog.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-6 pt-0">
            <Button type="button" variant="destructive" tooltip="Permanently remove this beyblade" disabled={pending} onClick={handleDelete}>
              {pending ? "Removing..." : "Remove Beyblade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
