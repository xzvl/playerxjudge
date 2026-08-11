-- Payment verification status for guest pre-registrations — the organizer
-- sets this after checking a submitted screenshot (or an on-site payment);
-- not guest-editable. Defaults to "pending" for every submission, whether or
-- not they used Advance Payment.
alter table public.tournament_preregistrations
  add column payment_status text not null default 'pending'
    check (payment_status in ('failed', 'pending', 'confirmed'));

-- Server-side name masking so a "hide me on public" guest's real blader
-- name never leaves the database for public consumption, even via a direct
-- API call — first and last character stay, everything between becomes
-- asterisks (e.g. "xzvl" -> "x**l").
create or replace function public.mask_blader_name(name text)
returns text
language sql
immutable
as $$
  select case
    when length(name) <= 2 then name
    else left(name, 1) || repeat('*', length(name) - 2) || right(name, 1)
  end;
$$;

-- Public-safe read of pre-registrations for the "who's pre-registered" list
-- on /tournaments/[slug] before a tournament starts. Only what's safe to
-- show a stranger (blader name, masked when asked) — no full name, Facebook
-- name, or payment info. The base table's RLS stays organizer/admin-only
-- (see 20250101000020/22); this view runs with the defining role's
-- privileges (Postgres views default to security_invoker = off), so it
-- bypasses the base table's RLS by design rather than needing a public
-- SELECT policy on the sensitive columns.
create or replace view public.public_preregistrations as
select
  p.id,
  p.tournament_id,
  case when p.hide_public then public.mask_blader_name(p.blader_name) else p.blader_name end as blader_name,
  p.hide_public,
  p.created_at
from public.tournament_preregistrations p
join public.tournaments t on t.id = p.tournament_id
where t.status not in ('draft', 'cancelled');

grant select on public.public_preregistrations to anon, authenticated;
