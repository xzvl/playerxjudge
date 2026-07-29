-- Lookup: tournament types (CMS-editable label/description over the enum)
create table public.tournament_types (
  id uuid primary key default gen_random_uuid(),
  code public.tournament_type not null unique,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Lookup: free-form tournament categories (e.g. "Regional Qualifier", "Community Cup")
create table public.tournament_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- Tournaments
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete restrict,
  community_id uuid references public.communities(id) on delete set null,
  category_id uuid references public.tournament_categories(id) on delete set null,
  type_id uuid references public.tournament_types(id) on delete set null,
  title text not null,
  slug text not null unique,
  short_description text not null,
  description text not null default '',
  rules text not null default '',
  thumbnail_url text,
  battle_type public.battle_type not null default 'solo',
  tournament_type public.tournament_type not null default 'casual',
  status public.tournament_status not null default 'draft',
  bracket_format public.bracket_format not null default 'single_elimination',
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_deadline timestamptz,
  location_name text not null,
  address text,
  province_id uuid references public.provinces(id) on delete set null,
  latitude double precision,
  longitude double precision,
  max_participants integer,
  entry_fee numeric(10, 2) not null default 0 check (entry_fee >= 0),
  prize_pool numeric(10, 2) not null default 0 check (prize_pool >= 0),
  champion_name text,
  view_count integer not null default 0,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint tournaments_dates_order check (ends_at is null or ends_at >= starts_at)
);

create index tournaments_organizer_id_idx on public.tournaments (organizer_id);
create index tournaments_community_id_idx on public.tournaments (community_id);
create index tournaments_province_id_idx on public.tournaments (province_id);
create index tournaments_status_idx on public.tournaments (status);
create index tournaments_starts_at_idx on public.tournaments (starts_at);

create trigger set_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();

-- Registrations
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  team_name text,
  status public.registration_status not null default 'pending',
  seed integer,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create index registrations_tournament_id_idx on public.registrations (tournament_id);
create index registrations_player_id_idx on public.registrations (player_id);

create trigger set_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();

alter table public.tournaments
  add column champion_registration_id uuid references public.registrations(id) on delete set null;

-- Brackets (one per tournament)
create table public.brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null unique references public.tournaments(id) on delete cascade,
  format public.bracket_format not null,
  structure jsonb not null default '{}'::jsonb,
  is_finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.brackets
  for each row execute function public.set_updated_at();

-- Matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bracket_id uuid references public.brackets(id) on delete set null,
  round integer not null,
  match_number integer not null,
  participant_a_id uuid references public.registrations(id) on delete set null,
  participant_b_id uuid references public.registrations(id) on delete set null,
  winner_id uuid references public.registrations(id) on delete set null,
  score jsonb not null default '{}'::jsonb,
  status public.match_status not null default 'scheduled',
  judge_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round, match_number)
);

create index matches_tournament_id_idx on public.matches (tournament_id);
create index matches_judge_id_idx on public.matches (judge_id);

create trigger set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

-- Judges: judge-to-tournament assignments
create table public.judges (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  judge_id uuid not null references public.profiles(id) on delete cascade,
  role_note text default 'Judge',
  assigned_at timestamptz not null default now(),
  unique (tournament_id, judge_id)
);

create index judges_tournament_id_idx on public.judges (tournament_id);
create index judges_judge_id_idx on public.judges (judge_id);

-- Organizers: community staff/organizer assignments
create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'organizer',
  created_at timestamptz not null default now(),
  unique (community_id, profile_id)
);

create index organizers_community_id_idx on public.organizers (community_id);
create index organizers_profile_id_idx on public.organizers (profile_id);
