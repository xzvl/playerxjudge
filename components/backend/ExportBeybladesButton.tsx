"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BEYBLADE_EXPORT_HEADERS, beybladeToExportRow, downloadCsv, downloadXlsx, toCsv } from "@/lib/beyblades/import-export";
import type { BeybladeItem } from "@/components/backend/BeybladesPanel";

export function ExportBeybladesButton({ beyblades }: { beyblades: BeybladeItem[] }) {
  const [exporting, setExporting] = useState(false);

  function rows() {
    return [[...BEYBLADE_EXPORT_HEADERS], ...beyblades.map(beybladeToExportRow)];
  }

  function handleCsv() {
    downloadCsv("beyblades.csv", toCsv(rows()));
  }

  async function handleXlsx() {
    setExporting(true);
    try {
      await downloadXlsx("beyblades.xlsx", rows());
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-1.5" tooltip="Download the full catalog" disabled={exporting || beyblades.length === 0}>
          <Download className="h-3.5 w-3.5" /> {exporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onSelect={handleCsv}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={handleXlsx}>
          Export as XLSX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
