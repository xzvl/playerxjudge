-- Leaderboard (denormalized standings, recomputed by app logic / scheduled job)
create table public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('global', 'province', 'community')),
  scope_ref_id uuid,
  role_context text not null default 'player' check (role_context in ('player', 'judge', 'organizer')),
  season text not null default 'all-time',
  wins integer not null default 0,
  losses integer not null default 0,
  points integer not null default 0,
  rank integer,
  updated_at timestamptz not null default now(),
  unique (profile_id, scope, scope_ref_id, role_context, season)
);

create index leaderboard_scope_idx on public.leaderboard (scope, scope_ref_id, role_context, season);
create index leaderboard_points_idx on public.leaderboard (points desc);

create trigger set_updated_at before update on public.leaderboard
  for each row execute function public.set_updated_at();

-- Achievements (catalog + earned junction)
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.profile_achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (profile_id, achievement_id)
);

create index profile_achievements_profile_id_idx on public.profile_achievements (profile_id);

-- Activity logs (user-facing activity feed)
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_profile_id_idx on public.activity_logs (profile_id, created_at desc);

-- Audit logs (privileged/admin action trail)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on public.audit_logs (actor_id, created_at desc);
