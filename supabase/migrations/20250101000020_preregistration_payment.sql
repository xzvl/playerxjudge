-- Pre-registration payment config (Settings, when Registration Fee is
-- "Paid") — amount/instructions/QR the organizer sets so guests know how to
-- pay when pre-registering. Separate from the general entry_fee column.
alter table public.tournaments
  add column requires_preregistration_payment boolean not null default false,
  add column preregistration_amount numeric(10, 2),
  add column preregistration_instructions text,
  add column preregistration_qr_url text;

-- Guest pre-registration capture from the public "Pre-register" popup — not
-- account-bound (no player_id/profiles row required), unlike the existing
-- `registrations` table. Just a lead-capture list for the organizer for now;
-- no approval/moderation workflow yet.
create table public.tournament_preregistrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  full_name text not null,
  blader_name text not null,
  facebook_name text not null,
  hide_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index tournament_preregistrations_tournament_id_idx on public.tournament_preregistrations (tournament_id);

alter table public.tournament_preregistrations enable row level security;

-- Anyone (including anonymous visitors) can submit, as long as the
-- tournament is actually publicly visible (not a draft, not cancelled).
create policy "tournament_preregistrations_insert_public" on public.tournament_preregistrations for insert
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.status not in ('draft', 'cancelled')
    )
  );

-- Only the organizer (or an admin) can read submissions back — this is
-- lead-capture data, not meant to be publicly listable.
create policy "tournament_preregistrations_select_organizer" on public.tournament_preregistrations for select
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin());
