// Route-matching helpers shared between layout chrome (Header/Footer) and
// whichever pages need to know "am I on that page" without importing each
// other. Kept tiny and framework-agnostic (just a pathname string in, a
// boolean out) so it works from both server and "use client" components.

// The player view (/tournaments/[slug]/player) and the judge console
// (/tournaments/[slug]/judge) both render their own full app-shell — see
// PlayerViewShell / JudgeConsole — including their own header content, so
// the global site Header hides itself on both rather than stacking two
// headers. The Footer only hides on mobile, where each page's own fixed
// bottom nav already occupies that space.
export function isTournamentConsoleRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/tournaments\/[^/]+\/(player|judge)(?:\/|$)/.test(pathname);
}
