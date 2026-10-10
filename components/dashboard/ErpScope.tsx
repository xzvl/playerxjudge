"use client";

import { useEffect } from "react";

// The shells put `.erp` on their own root so the server render is already
// themed, but Radix portals (dialogs, sheets, dropdowns, tooltips) mount on
// <body>, outside that root. Mirroring the class onto <body> while a shell
// is mounted lets them pick up the same palette. Portals only open after an
// interaction, so applying it in an effect never flashes.
export function ErpScope() {
  useEffect(() => {
    document.body.classList.add("erp");
    return () => document.body.classList.remove("erp");
  }, []);
  return null;
}
