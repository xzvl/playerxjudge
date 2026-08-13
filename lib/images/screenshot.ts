// Client-side "screenshot this element" -> WebP, for the judge console's
// Submit Result flow (see JudgeConsole's handleBothConfirmed, which passes
// its own root — not document.body — so the Confirm Result dialog's portal
// stays out of the capture). Distinct from fileToWebp (lib/images/to-webp.ts),
// which converts an already-selected image file rather than rendering live
// DOM — html2canvas does that rendering, and this just carries its output
// canvas the rest of the way to a WebP Blob the same upload actions
// elsewhere already expect.
export async function captureElementAsWebp(element: HTMLElement, quality = 0.85): Promise<Blob> {
  const { default: html2canvas } = await import("html2canvas");
  // `element` itself is transparent (its background lives on <body>, see
  // globals.css's `body { @apply bg-background }`), and html2canvas's own
  // default `backgroundColor: null` renders that transparency straight
  // through to the WebP's alpha channel. Reading <body>'s own resolved
  // color instead — rather than hardcoding one — keeps this correct
  // whichever theme is actually active when the screenshot is taken.
  const backgroundColor = getComputedStyle(document.body).backgroundColor;
  const canvas = await html2canvas(element, {
    backgroundColor,
    useCORS: true,
    // The console can be taller than the viewport (score panels stack on
    // small screens) — capture the full scrollable element, not just what's
    // currently visible above the fold.
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Couldn't capture the page as an image."));
      },
      "image/webp",
      quality
    );
  });
}
