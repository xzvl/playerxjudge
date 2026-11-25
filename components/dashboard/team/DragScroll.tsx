"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

// Scroll container for wide tables: drag with the mouse to pan in both axes,
// and the vertical max-height lets a `sticky top-0` <thead> stay pinned.
// Touch devices keep their native scrolling.
export function DragScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, y: 0, left: 0, top: 0 });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
    // Let buttons, links, inputs and draggable rows behave normally.
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, [draggable]")) return;
    const el = ref.current;
    drag.current = { active: true, moved: false, x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    }
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!drag.current.active || !el) return;
    drag.current.active = false;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    el.style.cursor = "";
    el.style.userSelect = "";
  };

  // Swallow the click that ends a drag so links in cells don't fire.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={onClickCapture}
      className={cn("max-h-[28rem] overflow-auto overscroll-x-contain lg:cursor-grab", className)}
    >
      {children}
    </div>
  );
}
