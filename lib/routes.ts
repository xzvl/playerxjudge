// Route-matching helpers shared between layout chrome (Header/Footer) and
// whichever pages need to know "am I on that page" without importing each
// other. Kept tiny and framework-agnostic (just a pathname string in, a
// boolean out) so it works from both server and "use client" components.

// The player view (/tournaments/[slug]/player) renders its own app-shell —
// see PlayerViewShell — including its own header actions (notification bell
// / sign in-join / profile menu), so the global site Header hides itself
// here rather than stacking two headers. The Footer only hides on mobile,
// where the page's own fixed bottom nav already occupies that space.
export function isTournamentPlayerRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/tournaments\/[^/]+\/player(?:\/|$)/.test(pathname);
}
