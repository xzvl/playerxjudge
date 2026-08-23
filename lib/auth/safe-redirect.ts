// Guards every "?redirectTo=" value this app accepts (the /login page, the
// OAuth/magic-link callback route) against becoming an open redirect —
// whatever a visitor (or a crafted link) puts in that query param ends up
// concatenated straight onto this site's own origin (see
// app/auth/callback/route.ts and signInWithPassword in app/(auth)/actions.ts),
// so only a same-origin, path-rooted target is ever honored. Anything else —
// an absolute URL, empty/missing, or a protocol-relative "//host" trick that
// browsers treat as "same scheme, different host" — falls back to `fallback`.
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
