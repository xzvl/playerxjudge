-- ============================================================
-- Backs /backend, the unified admin console replacing the two partial
-- surfaces it retires (/account/admin, /dashboard/admin):
--   - `profiles.is_banned` — Player "remove" means ban/suspend, not account
--     deletion (see decideBanPlayer, app/backend/players/actions.ts).
--     Reuses "profiles_update_own_or_admin" (20250101000006), already
--     admin-writable — no new policy needed.
--   - `static_pages` — CMS content for the still-hardcoded-placeholder
--     Privacy Policy / Terms / a new How to Use page (see
--     app/privacy, app/terms, app/how-to-use and their /backend editors).
-- ============================================================

alter table public.profiles add column is_banned boolean not null default false;

create table public.static_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('privacy-policy', 'terms-of-service', 'how-to-use')),
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create trigger set_updated_at before update on public.static_pages
  for each row execute function public.set_updated_at();

alter table public.static_pages enable row level security;

create policy "static_pages_select_all" on public.static_pages for select using (true);
create policy "static_pages_write_admin" on public.static_pages for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.static_pages (slug, title, body) values
  ('privacy-policy', 'Privacy Policy', 'Our full privacy policy is being finalized and will be published here before launch.'),
  ('terms-of-service', 'Terms & Conditions', 'Full legal terms are being finalized and will be published here before launch.'),
  ('how-to-use', 'How to Use PlayerXJudge', 'A step-by-step guide to using PlayerXJudge is coming soon.');
