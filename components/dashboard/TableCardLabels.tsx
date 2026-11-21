"use client";

import { useEffect } from "react";

// Header text for a <th>, ignoring screen-reader-only text (an "Actions"
// column whose header is just `<span class="sr-only">` gets no label).
function headerLabel(th: Element): string {
  const clone = th.cloneNode(true) as Element;
  clone.querySelectorAll(".sr-only").forEach((node) => node.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

// React stamps a `__reactFiber$…` key on every node it owns. A table without
// one is still raw server HTML waiting to hydrate (streamed pages hydrate
// after the shell), and adding attributes to it now would cause a hydration
// mismatch.
function isHydrated(el: Element): boolean {
  return Object.keys(el).some((key) => key.startsWith("__reactFiber$"));
}

// Returns false when the table was skipped because it hasn't hydrated yet.
function labelTable(table: HTMLTableElement): boolean {
  if (!isHydrated(table)) return false;
  const headerRow = table.tHead?.rows[table.tHead.rows.length - 1];
  if (!headerRow) return true;

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
  return true;
}

// Returns true if every table was labelled (none waiting on hydration).
function labelAll(root: ParentNode): boolean {
  let done = true;
  root.querySelectorAll("table").forEach((table) => {
    if (!labelTable(table as HTMLTableElement)) done = false;
  });
  return done;
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
    let retry = 0;
    let tries = 0;
    // Tables still waiting on hydration don't trigger the observer, so poll
    // for them briefly.
    const run = () => {
      if (labelAll(root)) return;
      if (tries++ < 60) retry = window.setTimeout(run, 250);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        tries = 0;
        window.clearTimeout(retry);
        run();
      });
    };

    run();
    // childList only: setting data-label is an attribute change, so this
    // never re-triggers itself.
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      observer.disconnect();
    };
  }, [rootId]);

  return null;
}
