import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = ["/dashboard", "/account", "/backend"];
const AUTH_PAGES = ["/login", "/register"];

// ---------------------------------------------------------------------------
// Ban check memo. Checking `profiles.is_banned` costs a database round trip,
// and it used to run on every request under a protected prefix (every page,
// every RSC navigation, every server action). Instead, a passed check is
// remembered for BAN_CHECK_TTL_MS in a cookie that is bound to the user id
// and HMAC-signed with a key derived from a server-only secret, so it can't
// be forged or reused by another account. A ban therefore takes effect on
// the next check, at most BAN_CHECK_TTL_MS later (sign-in always checks
// immediately, see signInWithPassword).
// ---------------------------------------------------------------------------
const BAN_CHECK_COOKIE = "pxj_bc";
const BAN_CHECK_TTL_MS = 5 * 60 * 1000;

let banCheckKey: Promise<CryptoKey | null> | null = null;

function getBanCheckKey(): Promise<CryptoKey | null> {
  if (!banCheckKey) {
    const secret = process.env.BAN_CHECK_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    banCheckKey = secret
      ? (async () => {
          // Derive a purpose-specific key so the raw secret is never the HMAC key.
          const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pxj-ban-check:${secret}`));
          return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
        })()
      : Promise.resolve(null);
  }
  return banCheckKey;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signBanCheck(userId: string, expiresAt: number): Promise<string | null> {
  const key = await getBanCheckKey();
  if (!key) return null;
  const payload = `${userId}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

async function hasValidBanCheck(value: string | undefined, userId: string): Promise<boolean> {
  if (!value) return false;
  const [id, expires, signature] = value.split(".");
  if (id !== userId || !signature || !(Number(expires) > Date.now())) return false;
  const expected = await signBanCheck(id, Number(expires));
  // Constant-time-ish compare on equal-length strings.
  if (!expected || expected.length !== value.length) return false;
  let diff = 0;
  for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() refreshes an expired session (same as getUser()) but then
  // verifies the access token locally against the project's cached public
  // signing key (ES256), instead of a round trip to the Auth server on
  // every request. Falls back to a server check by itself if the project
  // ever moves back to a symmetric key.
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthPage = AUTH_PAGES.some((page) => pathname.startsWith(page));

  if (!userId && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Catches a banned account (see /backend/players) mid-session, and anyone
  // banned who signed in via magic link/Google rather than the password form
  // signInWithPassword already checks. Memoized, see BAN_CHECK_COOKIE above.
  if (userId && isProtected && !(await hasValidBanCheck(request.cookies.get(BAN_CHECK_COOKIE)?.value, userId))) {
    const { data: profile } = await supabase.from("profiles").select("is_banned").eq("id", userId).maybeSingle();
    if (profile?.is_banned) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", "banned");
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete(BAN_CHECK_COOKIE);
      return response;
    }
    const expiresAt = Date.now() + BAN_CHECK_TTL_MS;
    const token = await signBanCheck(userId, expiresAt);
    if (token) {
      supabaseResponse.cookies.set(BAN_CHECK_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: BAN_CHECK_TTL_MS / 1000,
      });
    }
  }

  if (userId && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
