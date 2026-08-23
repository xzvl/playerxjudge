"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// A lightweight in-page popup for viewing a match's submitted screenshot —
// used anywhere a "Camera" screenshot affordance shows up (player match
// history, judge console, organizer match details). Previously these all
// opened the image via `<a target="_blank">`, which on mobile browsers (and
// most desktop popup/download settings) either got silently blocked or
// yanked the viewer out of the app entirely instead of just showing the
// picture. z-[60] so it can nest above a parent Dialog (e.g. Match Details)
// without fighting it for stacking order.
export function ScreenshotLightboxDialog({
  open,
  onOpenChange,
  imageUrl,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] max-w-3xl bg-surface-container-lowest p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{title ?? "Match Screenshot"}</DialogTitle>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a static/local asset */}
        <img src={imageUrl} alt={title ?? "Match screenshot"} className="max-h-[85vh] w-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}
