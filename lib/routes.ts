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

// Every /account page renders its own standalone shell (DashboardShell in
// "standalone" mode — full-height branded sidebar + its own search/profile
// header) instead of the global site Header, same reasoning as the
// tournament console above. RoleApplicationGate (shown in place of the
// shell for an unapproved organizer/judge/sponsor) brings its own minimal
// header too, so this is still safe to hide unconditionally for the whole
// /account tree.
export function isAccountRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/account(?:\/|$)/.test(pathname);
}

// /backend (the staff console) uses the same standalone DashboardShell as
// /account — see app/backend/layout.tsx, which now passes `user` too — so
// it hides the global Header/Footer the same way. Kept as its own matcher
// (rather than folded into isAccountRoute) since the two path prefixes are
// unrelated; callers that care about both check both.
export function isBackendRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/backend(?:\/|$)/.test(pathname);
}
