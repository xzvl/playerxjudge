"use client";

import { useEffect } from "react";

// Header text for a <th>, ignoring screen-reader-only text (an "Actions"
// column whose header is just `<span class="sr-only">` gets no label).
function headerLabel(th: Element): string {
  const clone = th.cloneNode(true) as Element;
  clone.querySelectorAll(".sr-only").forEach((node) => node.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

function labelTable(table: HTMLTableElement) {
  const headerRow = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!headerRow) return;

  // Expand colSpans so column positions line up with the body cells.
  const labels: string[] = [];
  for (const th of Array.from(headerRow.cells)) {
    const label = headerLabel(th);
    for (let i = 0; i < Math.max(1, th.colSpan); i++) labels.push(label);
  }

  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      let column = 0;
      for (const cell of Array.from(row.cells)) {
        const label = cell.colSpan > 1 && cell.colSpan >= labels.length ? "" : (labels[column] ?? "");
        if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
        column += Math.max(1, cell.colSpan);
      }
    }
  }
}

function labelAll(root: ParentNode) {
  root.querySelectorAll("table").forEach((table) => labelTable(table as HTMLTableElement));
}

// Copies each table's column names onto its body cells as `data-label`, so
// the tablet/phone card layout in globals.css (`#dashboard-content table`) can show
// "Column: value" pairs. Watches for re-renders (pagination, filtering,
// client navigation) and relabels. Renders nothing.
export function TableCardLabels({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => labelAll(root));
    };

    labelAll(root);
    // childList only: setting data-label is an attribute change, so this
    // never re-triggers itself.
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [rootId]);

  return null;
}
