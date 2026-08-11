import { useEffect, useRef } from "react";

// Click-and-drag panning for horizontally scrollable round grids (group-stage
// matches, final-stage bracket), in addition to native horizontal/vertical
// scrollbars/wheel/trackpad scrolling. Skips capture when the press starts on
// an interactive element so buttons/links/inputs inside the scroll area keep
// receiving normal clicks.
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || !el) return;
      if ((e.target as HTMLElement | null)?.closest("button, a, input")) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      scrollLeft = el.scrollLeft;
      scrollTop = el.scrollTop;
      el.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging || !el) return;
      el.scrollLeft = scrollLeft - (e.clientX - startX);
      el.scrollTop = scrollTop - (e.clientY - startY);
    }
    function onPointerUp() {
      dragging = false;
    }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerUp);
    };
  }, []);

  return ref;
}
