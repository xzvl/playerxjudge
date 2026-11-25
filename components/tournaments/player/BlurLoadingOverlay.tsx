"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PlayerLoadingScreen } from "@/components/tournaments/player/PlayerLoadingScreen";

// Full-screen blurred-black loader for saves/updates on the public
// tournament consoles (same look as PlayerNamePicker's switching overlay).
// Portaled to <body> so an ancestor transform can't offset `fixed`.
export function BlurLoadingOverlay({ show, label = "Saving…" }: { show: boolean; label?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!show || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <PlayerLoadingScreen label={label} />
    </div>,
    document.body
  );
}
