// CSV/XLSX import & export for the /backend/beyblades catalog. Columns are
// fixed and always in this order for export; import reads by header name
// (case-insensitive, trimmed) so a re-ordered or partial sheet still works.
//
// Enum-ish columns (Type/Spin Direction/Series/System Line/Category) use the
// same raw snake_case values the rest of the app uses (e.g. "x_generation",
// not "X Generation") — see BEYBLADE_*_OPTIONS in lib/validations/beyblade.ts
// for the allowed values.
//
// Import always creates new rows, never updates existing ones — `code` isn't
// a unique key (see 20250101000040_beyblades_code_not_unique.sql), so there's
// no reliable field to upsert against. Blade-assembly pickers (lock chip/
// main blade/etc.) aren't columns here, same limitation the old paste-CSV
// bulk-add had — open the row afterward to fill those in.
import { beybladeSchema, DEFAULT_BEYBLADE_VALUES, type BeybladeInput } from "@/lib/validations/beyblade";

export const BEYBLADE_EXPORT_HEADERS = [
  "Name",
  "Short Name",
  "Type",
  "Code",
  "Spin Direction",
  "Attack",
  "Defense",
  "Stamina",
  "Height",
  "Dash",
  "Burst Resistance",
  "Description",
  "Series",
  "System Line",
  "Category",
  "Image Path",
  "Image File Name",
] as const;

// The view-model shape BeybladesPanel/page.tsx already work with — see
// BeybladeItem in components/backend/BeybladesPanel.tsx.
export interface ExportableBeyblade {
  name: string;
  shortName: string;
  // null for parts that don't have a type/spin direction of their own —
  // Lock Chips, Ratchets, and the other individual Custom Line components.
  type: string | null;
  code: string;
  spinDirection: string | null;
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  height: number | null;
  dash: number | null;
  burstResistance: number | null;
  description: string | null;
  series: string;
  systemLine: string;
  category: string;
  imageUrl: string | null;
}

function basename(url: string): string {
  const withoutQuery = url.split("?")[0];
  const last = withoutQuery.split("/").pop();
  return last ?? "";
}

export function beybladeToExportRow(b: ExportableBeyblade): (string | number)[] {
  const stat = (v: number | null) => v ?? "";
  return [
    b.name,
    b.shortName,
    b.type ?? "",
    b.code,
    b.spinDirection ?? "",
    stat(b.attack),
    stat(b.defense),
    stat(b.stamina),
    stat(b.height),
    stat(b.dash),
    stat(b.burstResistance),
    b.description ?? "",
    b.series,
    b.systemLine,
    b.category,
    b.imageUrl ?? "",
    b.imageUrl ? basename(b.imageUrl) : "",
  ];
}

function escapeCsvField(value: string | number) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // Leading BOM so Excel opens UTF-8 CSVs (accented series/description text)
  // without mangling them.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(filename: string, rows: (string | number)[][]) {
  // Loaded lazily — exceljs is a sizeable dependency and this only runs on
  // an explicit "Export as XLSX" click.
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Beyblades");
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 18;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(filename, new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

// ---- Import ----

export interface ImportRawRow {
  name: string;
  shortName: string;
  type: string;
  code: string;
  spinDirection: string;
  attack: string;
  defense: string;
  stamina: string;
  height: string;
  dash: string;
  burstResistance: string;
  description: string;
  series: string;
  systemLine: string;
  category: string;
  imagePath: string;
  imageFileName: string;
}

const EMPTY_RAW_ROW: ImportRawRow = {
  name: "",
  shortName: "",
  type: "",
  code: "",
  spinDirection: "",
  attack: "",
  defense: "",
  stamina: "",
  height: "",
  dash: "",
  burstResistance: "",
  description: "",
  series: "",
  systemLine: "",
  category: "",
  imagePath: "",
  imageFileName: "",
};

const HEADER_TO_KEY: Record<string, keyof ImportRawRow> = {
  name: "name",
  "short name": "shortName",
  type: "type",
  code: "code",
  "spin direction": "spinDirection",
  attack: "attack",
  defense: "defense",
  stamina: "stamina",
  height: "height",
  dash: "dash",
  "burst resistance": "burstResistance",
  description: "description",
  series: "series",
  "system line": "systemLine",
  category: "category",
  "image path": "imagePath",
  "image file name": "imageFileName",
};

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // exceljs hands back rich objects for formulas/hyperlinks/dates in some
    // cells — fall back to their text representation rather than
    // "[object Object]".
    const rich = value as { text?: string; result?: unknown };
    if (typeof rich.text === "string") return rich.text;
    if (rich.result !== undefined) return cellToString(rich.result);
    return "";
  }
  return String(value).trim();
}

// Accepts .csv (parsed by hand — small, dependency-free) and .xlsx (parsed
// via exceljs, loaded lazily). Reads by header name so column order/omitted
// columns don't matter; unrecognized columns are ignored.
export async function parseImportFile(file: File): Promise<ImportRawRow[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  const table = isCsv ? parseCsvText(await file.text()) : await parseXlsxFile(file);
  if (table.length === 0) return [];

  const headerKeys = table[0].map((h) => HEADER_TO_KEY[h.trim().toLowerCase()] ?? null);
  return table.slice(1).map((cells) => {
    const row: ImportRawRow = { ...EMPTY_RAW_ROW };
    headerKeys.forEach((key, i) => {
      if (key) row[key] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function parseCsvText(text: string): string[][] {
  // Minimal RFC 4180 parser: handles quoted fields, escaped quotes (""),
  // and commas/newlines inside quotes. Good enough for a small admin
  // import tool without pulling in a CSV dependency.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const normalized = text.replace(/\r\n/g, "\n");

  while (i < normalized.length) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }
  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

async function parseXlsxFile(file: File): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cellToString(cell.value));
    });
    if (cells.some((c) => c.length > 0)) rows.push(cells);
  });
  return rows;
}

export interface ImportRowResult {
  line: number;
  imageFileName: string;
  parsed: { success: true; data: BeybladeInput } | { success: false; reason: string };
}

// Enum-ish columns are matched case-insensitively — a spreadsheet naturally
// ends up with "Right"/"Attack"/"X_Generation" (Excel/Sheets autocapitalize,
// people type what reads naturally), and the schema's enums are strict
// lowercase slugs. Only the case is normalized; the value still has to
// match one of the real slugs (e.g. "attack", not "Attack Type").
function lowercase(v: string): string {
  return v.trim().toLowerCase();
}

export function validateImportRows(rows: ImportRawRow[]): ImportRowResult[] {
  return rows.map((row, i) => {
    const parsed = beybladeSchema.safeParse({
      ...DEFAULT_BEYBLADE_VALUES,
      name: row.name,
      shortName: row.shortName,
      code: row.code,
      type: lowercase(row.type),
      spinDirection: lowercase(row.spinDirection),
      attack: row.attack,
      defense: row.defense,
      stamina: row.stamina,
      height: row.height,
      dash: row.dash,
      burstResistance: row.burstResistance,
      description: row.description,
      series: lowercase(row.series) || "x_generation",
      systemLine: lowercase(row.systemLine),
      category: lowercase(row.category),
    });
    return {
      line: i + 1,
      imageFileName: row.imageFileName,
      parsed: parsed.success ? { success: true, data: parsed.data } : { success: false, reason: parsed.error.issues[0]?.message ?? "Invalid row" },
    };
  });
}
