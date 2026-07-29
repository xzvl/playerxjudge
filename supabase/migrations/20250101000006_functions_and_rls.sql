-- ============================================================
-- Helper functions (security definer to safely read profiles.role
-- without triggering recursive RLS on the profiles table itself)
-- ============================================================

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_organizer_of_tournament(target_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.tournaments t
    where t.id = target_tournament_id and t.organizer_id = auth.uid()
  );
$$;

create or replace function public.is_organizer_of_community(target_community_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.communities c
    where c.id = target_community_id and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.organizers o
    where o.community_id = target_community_id and o.profile_id = auth.uid()
  );
$$;

create or replace function public.is_judge_of_tournament(target_tournament_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.judges j
    where j.tournament_id = target_tournament_id and j.judge_id = auth.uid()
  );
$$;

create or replace function public.is_sponsor_owner(target_sponsor_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.sponsors s
    where s.id = target_sponsor_id and s.profile_id = auth.uid()
  );
$$;

-- Free-tier tournament cap: non-premium organizers may create at most 2 tournaments
create or replace function public.enforce_tournament_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  organizer_plan public.subscription_plan;
  existing_count integer;
begin
  select subscription_plan into organizer_plan
  from public.profiles where id = new.organizer_id;

  if organizer_plan = 'premium' then
    return new;
  end if;

  select count(*) into existing_count
  from public.tournaments
  where organizer_id = new.organizer_id;

  if existing_count >= 2 then
    raise exception 'Free plan is limited to 2 tournaments. Upgrade to Premium for unlimited tournaments.';
  end if;

  return new;
end;
$$;

create trigger enforce_tournament_limit_trigger
  before insert on public.tournaments
  for each row execute function public.enforce_tournament_limit();

-- ============================================================
-- Enable Row Level Security on every table
-- ============================================================

alter table public.provinces enable row level security;
alter table public.communities enable row level security;
alter table public.profiles enable row level security;
alter table public.tournament_types enable row level security;
alter table public.tournament_categories enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.brackets enable row level security;
alter table public.matches enable row level security;
alter table public.judges enable row level security;
alter table public.organizers enable row level security;
alter table public.sponsor_packages enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_community_links enable row level security;
alter table public.sponsor_tournament_links enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.images enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.faqs enable row level security;
alter table public.leaderboard enable row level security;
alter table public.achievements enable row level security;
alter table public.profile_achievements enable row level security;
alter table public.activity_logs enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- Provinces — public read, admin write
-- ============================================================
create policy "provinces_select_all" on public.provinces for select using (true);
create policy "provinces_write_admin" on public.provinces for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Profiles
-- ============================================================
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own_or_admin" on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());
create policy "profiles_delete_admin" on public.profiles for delete
  using (public.is_admin());

-- ============================================================
-- Communities
-- ============================================================
create policy "communities_select_all" on public.communities for select using (true);
create policy "communities_insert_authenticated" on public.communities for insert
  with check (auth.uid() = owner_id);
create policy "communities_update_owner_or_admin" on public.communities for update
  using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());
create policy "communities_delete_owner_or_admin" on public.communities for delete
  using (auth.uid() = owner_id or public.is_admin());

-- ============================================================
-- Tournament types / categories — public read, admin write
-- ============================================================
create policy "tournament_types_select_all" on public.tournament_types for select using (true);
create policy "tournament_types_write_admin" on public.tournament_types for all
  using (public.is_admin()) with check (public.is_admin());

create policy "tournament_categories_select_all" on public.tournament_categories for select using (true);
create policy "tournament_categories_write_admin" on public.tournament_categories for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Tournaments
-- ============================================================
create policy "tournaments_select_published_or_own" on public.tournaments for select
  using (
    status <> 'draft'
    or organizer_id = auth.uid()
    or public.is_admin()
  );
create policy "tournaments_insert_own" on public.tournaments for insert
  with check (organizer_id = auth.uid());
create policy "tournaments_update_organizer_or_admin" on public.tournaments for update
  using (organizer_id = auth.uid() or public.is_organizer_of_community(community_id) or public.is_admin())
  with check (organizer_id = auth.uid() or public.is_organizer_of_community(community_id) or public.is_admin());
create policy "tournaments_delete_organizer_or_admin" on public.tournaments for delete
  using (organizer_id = auth.uid() or public.is_admin());

-- ============================================================
-- Registrations
-- ============================================================
create policy "registrations_select_scoped" on public.registrations for select
  using (
    player_id = auth.uid()
    or public.is_organizer_of_tournament(tournament_id)
    or public.is_judge_of_tournament(tournament_id)
    or public.is_admin()
  );
create policy "registrations_insert_own" on public.registrations for insert
  with check (player_id = auth.uid());
create policy "registrations_update_own_or_organizer" on public.registrations for update
  using (player_id = auth.uid() or public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (player_id = auth.uid() or public.is_organizer_of_tournament(tournament_id) or public.is_admin());
create policy "registrations_delete_own_or_organizer" on public.registrations for delete
  using (player_id = auth.uid() or public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- ============================================================
-- Brackets
-- ============================================================
create policy "brackets_select_all" on public.brackets for select using (true);
create policy "brackets_write_organizer_or_admin" on public.brackets for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- ============================================================
-- Matches
-- ============================================================
create policy "matches_select_all" on public.matches for select using (true);
create policy "matches_write_judge_organizer_or_admin" on public.matches for all
  using (
    public.is_judge_of_tournament(tournament_id)
    or public.is_organizer_of_tournament(tournament_id)
    or public.is_admin()
  )
  with check (
    public.is_judge_of_tournament(tournament_id)
    or public.is_organizer_of_tournament(tournament_id)
    or public.is_admin()
  );

-- ============================================================
-- Judges (assignment)
-- ============================================================
create policy "judges_select_all" on public.judges for select using (true);
create policy "judges_write_organizer_or_admin" on public.judges for all
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin())
  with check (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

-- ============================================================
-- Organizers (community staff)
-- ============================================================
create policy "organizers_select_all" on public.organizers for select using (true);
create policy "organizers_write_owner_or_admin" on public.organizers for all
  using (public.is_organizer_of_community(community_id) or public.is_admin())
  with check (public.is_organizer_of_community(community_id) or public.is_admin());

-- ============================================================
-- Sponsor packages — public read, admin write
-- ============================================================
create policy "sponsor_packages_select_all" on public.sponsor_packages for select using (true);
create policy "sponsor_packages_write_admin" on public.sponsor_packages for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Sponsors
-- ============================================================
create policy "sponsors_select_all" on public.sponsors for select using (true);
create policy "sponsors_insert_own" on public.sponsors for insert
  with check (profile_id = auth.uid());
create policy "sponsors_update_own_or_admin" on public.sponsors for update
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
create policy "sponsors_delete_admin" on public.sponsors for delete
  using (public.is_admin());

create policy "sponsor_community_links_select_all" on public.sponsor_community_links for select using (true);
create policy "sponsor_community_links_write_owner_or_admin" on public.sponsor_community_links for all
  using (public.is_sponsor_owner(sponsor_id) or public.is_admin())
  with check (public.is_sponsor_owner(sponsor_id) or public.is_admin());

create policy "sponsor_tournament_links_select_all" on public.sponsor_tournament_links for select using (true);
create policy "sponsor_tournament_links_write_owner_or_admin" on public.sponsor_tournament_links for all
  using (public.is_sponsor_owner(sponsor_id) or public.is_admin())
  with check (public.is_sponsor_owner(sponsor_id) or public.is_admin());

-- ============================================================
-- Subscriptions & payments — client may only read; writes happen
-- server-side (Server Actions using the service-role client)
-- ============================================================
create policy "subscriptions_select_own_or_admin" on public.subscriptions for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "subscriptions_write_admin" on public.subscriptions for all
  using (public.is_admin()) with check (public.is_admin());

create policy "payments_select_own_or_admin" on public.payments for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "payments_write_admin" on public.payments for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Notifications
-- ============================================================
create policy "notifications_select_own" on public.notifications for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "notifications_update_own" on public.notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete
  using (profile_id = auth.uid() or public.is_admin());
create policy "notifications_insert_admin" on public.notifications for insert
  with check (public.is_admin());

-- ============================================================
-- Announcements
-- ============================================================
create policy "announcements_select_all" on public.announcements for select using (true);
create policy "announcements_insert_author" on public.announcements for insert
  with check (
    author_id = auth.uid()
    and (
      (tournament_id is not null and public.is_organizer_of_tournament(tournament_id))
      or (community_id is not null and public.is_organizer_of_community(community_id))
      or public.is_admin()
    )
  );
create policy "announcements_update_author_or_admin" on public.announcements for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "announcements_delete_author_or_admin" on public.announcements for delete
  using (author_id = auth.uid() or public.is_admin());

-- ============================================================
-- Images
-- ============================================================
create policy "images_select_all" on public.images for select using (true);
create policy "images_insert_own" on public.images for insert
  with check (owner_id = auth.uid());
create policy "images_delete_own_or_admin" on public.images for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================
-- Comments
-- ============================================================
create policy "comments_select_all" on public.comments for select using (is_deleted = false or public.is_admin());
create policy "comments_insert_own" on public.comments for insert
  with check (author_id = auth.uid());
create policy "comments_update_own_or_admin" on public.comments for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
create policy "comments_delete_admin" on public.comments for delete
  using (public.is_admin());

-- ============================================================
-- Reports
-- ============================================================
create policy "reports_select_own_or_admin" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_insert_own" on public.reports for insert
  with check (reporter_id = auth.uid());
create policy "reports_update_admin" on public.reports for update
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- FAQs
-- ============================================================
create policy "faqs_select_published_or_admin" on public.faqs for select
  using (is_published = true or public.is_admin());
create policy "faqs_write_admin" on public.faqs for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Leaderboard & achievements — public read, system/admin write
-- ============================================================
create policy "leaderboard_select_all" on public.leaderboard for select using (true);
create policy "leaderboard_write_admin" on public.leaderboard for all
  using (public.is_admin()) with check (public.is_admin());

create policy "achievements_select_all" on public.achievements for select using (true);
create policy "achievements_write_admin" on public.achievements for all
  using (public.is_admin()) with check (public.is_admin());

create policy "profile_achievements_select_all" on public.profile_achievements for select using (true);
create policy "profile_achievements_write_admin" on public.profile_achievements for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Activity logs
-- ============================================================
create policy "activity_logs_select_own_or_admin" on public.activity_logs for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "activity_logs_insert_own" on public.activity_logs for insert
  with check (profile_id = auth.uid());

-- ============================================================
-- Audit logs — admin only
-- ============================================================
create policy "audit_logs_select_admin" on public.audit_logs for select
  using (public.is_admin());
create policy "audit_logs_insert_admin" on public.audit_logs for insert
  with check (public.is_admin());
