"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "theme";

// Binary light/dark switch — dark is the app's original/default identity
// (see globals.css), light is the alternate palette. Persisted to
// localStorage and applied via a `data-theme="light"` attribute on <html>,
// which every CSS variable in globals.css branches on; the inline script in
// app/layout.tsx does the same read before first paint so a reload doesn't
// flash the wrong theme.
export function ThemeToggle({ className }: { className?: string } = {}) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.getAttribute("data-theme") === "light");
  }, []);

  function toggle() {
    const next = !isLight;
    setIsLight(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem(STORAGE_KEY, "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(STORAGE_KEY, "dark");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      tooltip={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      onClick={toggle}
    >
      {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
