-- Sponsor packages (Bronze / Silver / Gold)
create table public.sponsor_packages (
  id uuid primary key default gen_random_uuid(),
  tier public.sponsor_tier not null unique,
  name text not null,
  monthly_price numeric(10, 2),
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Sponsors
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  company_name text not null,
  logo_url text,
  website_url text,
  package_id uuid references public.sponsor_packages(id) on delete set null,
  tier public.sponsor_tier not null default 'bronze',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.sponsors
  for each row execute function public.set_updated_at();

create table public.sponsor_community_links (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sponsor_id, community_id)
);

create table public.sponsor_tournament_links (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  clicks integer not null default 0,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  unique (sponsor_id, tournament_id)
);

create index sponsor_community_links_sponsor_id_idx on public.sponsor_community_links (sponsor_id);
create index sponsor_tournament_links_sponsor_id_idx on public.sponsor_tournament_links (sponsor_id);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_method public.payment_method,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'PHP',
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  reference_number text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index payments_profile_id_idx on public.payments (profile_id);
create index payments_status_idx on public.payments (status);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_profile_id_idx on public.notifications (profile_id, is_read);

-- Announcements
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint announcements_scope_check check (tournament_id is not null or community_id is not null)
);

create index announcements_tournament_id_idx on public.announcements (tournament_id);
create index announcements_community_id_idx on public.announcements (community_id);

-- Images (Supabase Storage references)
create table public.images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index images_tournament_id_idx on public.images (tournament_id);
create index images_community_id_idx on public.images (community_id);

-- Comments (threaded, scoped to a tournament or a community)
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  community_id uuid references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_scope_check check (tournament_id is not null or community_id is not null)
);

create index comments_tournament_id_idx on public.comments (tournament_id);
create index comments_community_id_idx on public.comments (community_id);

create trigger set_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

-- Reports (moderation)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('tournament', 'community', 'comment', 'profile')),
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);

-- FAQs
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();
