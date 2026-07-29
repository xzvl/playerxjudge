# PlayerXJudge

Beyblade X community tournament management platform. Next.js 15 (App Router) + TypeScript + Tailwind + Supabase.

This repository currently implements **Phase 1: Foundation** — theme, layout, homepage, auth, route
structure, and the full database schema. See [Deferred to later phases](#deferred-to-later-phases)
for what's intentionally not built yet.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, React Hook Form, Zod, TanStack Query
- **Backend**: Supabase (Auth, Postgres, RLS, Storage, planned Edge Functions/Realtime)
- **Maps**: Leaflet + React Leaflet + OpenStreetMap (wiring deferred, route stub exists at `/map`)
- **Calendar**: FullCalendar Community Edition (wiring deferred, route stub exists at `/calendar`)
- **Email**: Resend
- **Analytics**: Vercel Analytics
- **Deployment**: Vercel, from `github.com/xzvl/<repo>`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API.
3. Set `NEXT_PUBLIC_SITE_URL` (use `http://localhost:3000` for local dev).

### 3. Run the database migrations

Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies everything in `supabase/migrations/` in order: extensions & enums, core tables
(profiles/provinces/communities), tournament tables, social/commerce tables, stats tables,
helper functions + **Row Level Security policies on every table**, and full-text search triggers.

Then seed reference data (provinces, tournament types/categories, sponsor packages, achievements, FAQs):

```bash
psql "$(supabase db url)" -f supabase/seed.sql
```

Communities and tournaments in `seed.sql` need real `profiles.id` values (they're tied to
`auth.users`), so that part is a commented template — sign up a couple of test accounts through
the app first, then fill in the placeholders and run that block manually.

### 4. Configure Auth providers

In the Supabase dashboard → Authentication → Providers:

- **Email**: enabled by default (used for email/password and Magic Link).
- **Google**: enable it, set the Client ID/Secret from Google Cloud Console, and add
  `https://<your-project>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google
  Cloud Console.
- Authentication → URL Configuration: set the Site URL and add `<your-site>/auth/callback` as a
  redirect URL.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The homepage, navigation, and tournament
listings work against typed mock data (`lib/mock/tournaments.ts`) until you wire real Supabase
queries — the schema and RLS are ready for that swap.

## Deployment (Vercel)

1. Push this repo to `github.com/xzvl/<repo-name>`.
2. Import the repo in Vercel.
3. Add the same environment variables from `.env.local` to the Vercel project (Production +
   Preview).
4. Update `NEXT_PUBLIC_SITE_URL` to your production domain, and add
   `https://<your-domain>/auth/callback` to Supabase's Auth redirect URLs.
5. Deploy.

## Security notes

- **RLS is enabled on every table** in `supabase/migrations/20250101000006_functions_and_rls.sql`.
  Client code always goes through the anon key + RLS; the service-role key
  (`lib/supabase/admin.ts`) is guarded by `import "server-only"` and is only ever used inside
  Server Actions / Route Handlers that need elevated access.
- Auth session refresh + protected-route redirects happen in `middleware.ts` /
  `lib/supabase/middleware.ts`.
- Security headers + a baseline CSP are set in `next.config.ts`.
- `lib/rate-limit.ts` is a **best-effort, single-instance** in-memory limiter applied to the auth
  Server Actions. Vercel runs multiple isolated instances, so before relying on this in
  production, swap it for a shared store — [Upstash Redis](https://upstash.com/) via
  `@upstash/ratelimit` is the standard pairing with Vercel.
- All form input is validated with Zod (`lib/validations/`) both client- and server-side.

## Payments architecture

Subscriptions/payments are modeled in `supabase/migrations/20250101000004_social_commerce_tables.sql`
(`subscriptions`, `payments` tables, `payment_method` enum: `gcash`, `maya`, `bank_transfer`,
plus `stripe`/`paymongo` already reserved). Actual gateway integration (GCash/Maya checkout,
webhook handlers) is deferred to a later phase — the schema and RLS (client can only read its own
rows; writes happen server-side) are ready for it.

## Project structure

```
app/                      Next.js App Router routes
  (auth)/                 Auth Server Actions (route-group, no URL segment)
  auth/                   OAuth callback + password reset routes
  dashboard/<role>/       Role-based dashboard shells (player/judge/organizer/sponsor/admin)
  tournaments/[slug]/     Dynamic tournament sub-routes
components/
  ui/                     shadcn/ui primitives (hand-authored, theme-matched)
  layout/                 Header, Footer, SearchBar, PagePlaceholder, etc.
  home/                   Hero, QuickAccess, StatCounter
  tournaments/            TournamentCard, TournamentTable, TournamentDetailsModal, etc.
  dashboard/              DashboardShell, DashboardFeatureGrid
  auth/                   LoginForm, RegisterForm, ResetPasswordForm
  marquee/                Sponsor + payment-method marquees
lib/
  supabase/               client.ts (browser), server.ts (SSR), admin.ts (service role), middleware.ts
  validations/             Zod schemas
  mock/                    Typed mock data shaped like the real schema (swap for Supabase queries)
  types/database.ts        Hand-authored types; replace with `supabase gen types typescript` once live
supabase/
  migrations/              Numbered SQL migrations (schema, RLS, full-text search)
  seed.sql                 Reference data + commented community/tournament seed template
  config.toml               Local Supabase CLI config
```

## Deferred to later phases

Not included in this build — flagged so nothing here is mistaken as finished:

- Bracket-generation engine/logic and live scoring
- Real Leaflet map wiring (`/map` is a styled stub)
- Real FullCalendar wiring (`/calendar` is a styled stub)
- Payment gateway integration (GCash/Maya checkout flows, webhooks)
- Realtime notifications (Supabase Realtime)
- Full dashboard functionality beyond the sidebar shells
- CI/CD workflow (GitHub Actions)
- Unit/E2E tests
- CMS / feature flags / admin content tools
- GitHub repository creation & push (done manually by you, or ask your assistant)
