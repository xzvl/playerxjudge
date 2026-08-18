"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBeyblade, uploadBeybladeImage } from "@/app/backend/beyblades/actions";
import { fileToWebp } from "@/lib/images/to-webp";
import { ALLOWED_THUMBNAIL_TYPES, MAX_THUMBNAIL_INPUT_BYTES } from "@/lib/validations/tournament-wizard";
import {
  BEYBLADE_EXPORT_HEADERS,
  downloadCsv,
  parseImportFile,
  toCsv,
  validateImportRows,
  type ImportRowResult,
} from "@/lib/beyblades/import-export";
import type { BeybladeInput } from "@/lib/validations/beyblade";
import type { BeybladeItem } from "@/components/backend/BeybladesPanel";

const TEMPLATE_EXAMPLE_ROW = ["Dran Sword", "Dran Sword", "attack", "BX-01", "right", "", "", "", "", "", "", "", "x_generation", "basic_line", "blade", "", ""];

function inputToItem(id: string, input: BeybladeInput, imageUrl: string | null): BeybladeItem {
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  return {
    id,
    code: input.code.trim(),
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    type: input.type || null,
    systemLine: input.systemLine,
    category: input.category,
    spinDirection: input.spinDirection || null,
    attack: num(input.attack),
    defense: num(input.defense),
    stamina: num(input.stamina),
    height: num(input.height),
    dash: num(input.dash),
    burstResistance: num(input.burstResistance),
    description: input.description.trim() || null,
    series: input.series,
    imageUrl,
  };
}

interface RowIssue {
  line: number;
  reason: string;
}

interface ImageIssue {
  line: number;
  name: string;
  reason: string;
}

export function ImportBeybladesDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (imported: BeybladeItem[]) => void;
}) {
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const [sheetName, setSheetName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRowResult[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rowIssues, setRowIssues] = useState<RowIssue[] | null>(null);
  const [imageIssues, setImageIssues] = useState<ImageIssue[] | null>(null);
  const [summary, setSummary] = useState<{ created: number; imagesUploaded: number } | null>(null);

  const validRows = rows?.filter((r) => r.parsed.success) ?? [];
  const invalidRows = rows?.filter((r) => !r.parsed.success) ?? [];

  function reset() {
    setSheetName(null);
    setRows(null);
    setParseError(null);
    setImageFiles([]);
    setImporting(false);
    setProgress(0);
    setRowIssues(null);
    setImageIssues(null);
    setSummary(null);
    if (sheetInputRef.current) sheetInputRef.current.value = "";
    if (imagesInputRef.current) imagesInputRef.current.value = "";
  }

  async function handleSheetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setRows(null);
    setRowIssues(null);
    setImageIssues(null);
    setSummary(null);
    setSheetName(file.name);

    try {
      const raw = await parseImportFile(file);
      if (raw.length === 0) {
        setParseError("No rows found — check the file has a header row and at least one data row.");
        return;
      }
      setRows(validateImportRows(raw));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Couldn't read that file.");
    }
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImageFiles(Array.from(e.target.files ?? []));
  }

  function findImage(imageFileName: string): File | undefined {
    const target = imageFileName.trim().toLowerCase();
    if (!target) return undefined;
    return imageFiles.find((f) => f.name.toLowerCase() === target);
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setProgress(0);

    const created: BeybladeItem[] = [];
    const nextRowIssues: RowIssue[] = invalidRows.map((r) => ({
      line: r.line,
      reason: !r.parsed.success ? r.parsed.reason : "Invalid row",
    }));
    const nextImageIssues: ImageIssue[] = [];
    let imagesUploaded = 0;

    for (const row of validRows) {
      if (!row.parsed.success) continue;
      const input = row.parsed.data;

      const result = await createBeyblade(input);
      if (result.status === "error" || !result.id) {
        nextRowIssues.push({ line: row.line, reason: result.message ?? "Couldn't create this row." });
        setProgress((p) => p + 1);
        continue;
      }

      let imageUrl: string | null = null;
      if (row.imageFileName.trim()) {
        const match = findImage(row.imageFileName);
        if (!match) {
          nextImageIssues.push({ line: row.line, name: row.imageFileName, reason: "No matching file was selected." });
        } else if (!ALLOWED_THUMBNAIL_TYPES.includes(match.type)) {
          nextImageIssues.push({ line: row.line, name: row.imageFileName, reason: "Must be a JPG, PNG, or WebP file." });
        } else if (match.size > MAX_THUMBNAIL_INPUT_BYTES) {
          nextImageIssues.push({ line: row.line, name: row.imageFileName, reason: "File is too large (8MB max)." });
        } else {
          try {
            const webpBlob = await fileToWebp(match);
            const webpFile = new File([webpBlob], "image.webp", { type: "image/webp" });
            const formData = new FormData();
            formData.set("file", webpFile);
            const imageResult = await uploadBeybladeImage(result.id, formData);
            if (imageResult.status === "error") {
              nextImageIssues.push({ line: row.line, name: row.imageFileName, reason: imageResult.message ?? "Upload failed." });
            } else {
              imageUrl = imageResult.url ?? null;
              imagesUploaded += 1;
            }
          } catch (err) {
            nextImageIssues.push({ line: row.line, name: row.imageFileName, reason: err instanceof Error ? err.message : "Conversion failed." });
          }
        }
      }

      created.push(inputToItem(result.id, input, imageUrl));
      setProgress((p) => p + 1);
    }

    if (created.length > 0) onImported(created);
    setSummary({ created: created.length, imagesUploaded });
    setRowIssues(nextRowIssues);
    setImageIssues(nextImageIssues);
    setImporting(false);

    if (nextRowIssues.length === 0 && nextImageIssues.length === 0) {
      reset();
      onOpenChange(false);
    }
  }

  function handleDownloadTemplate() {
    const csv = toCsv([[...BEYBLADE_EXPORT_HEADERS], TEMPLATE_EXAMPLE_ROW]);
    downloadCsv("beyblades-template.csv", csv);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Beyblades</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file with a header row and these columns: {BEYBLADE_EXPORT_HEADERS.join(", ")}. Column order
            doesn&apos;t matter and a few can be left out. Each row always adds a new beyblade — the Blade-assembly pickers
            aren&apos;t set here, open each one afterward to fill those in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5"
              tooltip="Choose a .csv or .xlsx file"
              disabled={importing}
              onClick={() => sheetInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> {sheetName ?? "Choose Spreadsheet"}
            </Button>
            <input ref={sheetInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleSheetChange} />
            <button type="button" onClick={handleDownloadTemplate} className="text-xs text-primary underline-offset-4 hover:underline">
              Download a blank template
            </button>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5"
              tooltip="Select the image files referenced by the Image File Name column"
              disabled={importing}
              onClick={() => imagesInputRef.current?.click()}
            >
              <Images className="h-3.5 w-3.5" /> {imageFiles.length > 0 ? `${imageFiles.length} image(s) selected` : "Choose Images (optional)"}
            </Button>
            <input
              ref={imagesInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleImagesChange}
            />
            <p className="text-xs text-on-surface/50">
              Matched by exact file name against each row&apos;s Image File Name column, then converted to WebP automatically.
            </p>
          </div>

          {parseError ? (
            <p role="alert" className="text-sm text-destructive">
              {parseError}
            </p>
          ) : null}

          {rows && !parseError ? (
            <p className="text-sm text-on-surface/70">
              {rows.length} row(s) found — {validRows.length} valid{invalidRows.length > 0 ? `, ${invalidRows.length} need fixing` : ""}.
              {importing ? ` Importing ${progress}/${validRows.length}...` : ""}
            </p>
          ) : null}

          {summary ? (
            <p className="text-sm text-primary">
              Added {summary.created}. {summary.imagesUploaded} image(s) uploaded.
            </p>
          ) : null}

          {rowIssues && rowIssues.length > 0 ? (
            <div className="text-sm text-destructive">
              <p>{rowIssues.length} row(s) failed:</p>
              <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5">
                {rowIssues.map((f, i) => (
                  <li key={i}>
                    Line {f.line}: {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {imageIssues && imageIssues.length > 0 ? (
            <div className="text-sm text-on-surface/60">
              <p>{imageIssues.length} row(s) were added but their image wasn&apos;t:</p>
              <ul className="mt-1 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5">
                {imageIssues.map((f, i) => (
                  <li key={i}>
                    Line {f.line} ({f.name}): {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button type="button" tooltip="Add these beyblades" disabled={importing || validRows.length === 0} onClick={handleImport}>
            {importing ? "Importing..." : `Import ${validRows.length > 0 ? validRows.length : ""} Beyblade${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
