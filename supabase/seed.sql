-- Seed data safe to run immediately after migrations (no auth.users dependency).
-- Communities and tournaments reference profiles(id) -> auth.users(id), so those
-- are seeded separately once you have real accounts — see the commented
-- template at the bottom of this file.

insert into public.provinces (name, region) values
  ('Metro Manila', 'NCR'),
  ('Cebu', 'Region VII'),
  ('Davao del Sur', 'Region XI'),
  ('Pampanga', 'Region III'),
  ('Laguna', 'Region IV-A'),
  ('Iloilo', 'Region VI')
on conflict (name) do nothing;

insert into public.tournament_types (code, label, description) values
  ('casual', 'Casual', 'Low-stakes, beginner-friendly meetups.'),
  ('minor', 'Minor', 'Community-level competitive events.'),
  ('major', 'Major', 'Flagship regional/seasonal events with ranking points.'),
  ('emergency', 'Emergency', 'Short-notice replacement events.')
on conflict (code) do nothing;

insert into public.tournament_categories (name, slug, description) values
  ('Regional Qualifier', 'regional-qualifier', 'Feeds into national ranking qualifiers.'),
  ('Community Cup', 'community-cup', 'Community-run recurring cup events.'),
  ('Seasonal Championship', 'seasonal-championship', 'End-of-season championship events.')
on conflict (slug) do nothing;

insert into public.sponsor_packages (tier, name, monthly_price, features) values
  ('bronze', 'Bronze', null, '["Logo on community page", "Sponsor directory"]'::jsonb),
  ('silver', 'Silver', null, '["Homepage sponsor section", "Tournament sponsor badge", "Social media mention"]'::jsonb),
  ('gold', 'Gold', null, '["Featured homepage", "Priority sponsor placement", "Website backlink", "Event banners", "Marketing analytics", "Community newsletter feature"]'::jsonb)
on conflict (tier) do nothing;

insert into public.achievements (code, name, description, icon) values
  ('first_win', 'First Win', 'Win your first official match.', 'trophy'),
  ('champion', 'Champion', 'Win a major tournament.', 'crown'),
  ('ten_wins', '10 Wins', 'Reach 10 official match wins.', 'star')
on conflict (code) do nothing;

-- FAQ starter content (24 questions across 8 categories, plus the Privacy
-- Policy / Terms & Conditions bodies) now ships in
-- 20250101000047_faq_and_legal_content.sql, applied automatically by
-- `supabase db push` like the rest of the migrations. It's not repeated here
-- so re-running this file doesn't create duplicate FAQ rows (faqs.question
-- has no unique constraint to dedupe against). Manage FAQs going forward
-- from /backend/faqs.

-- ============================================================
-- Communities & tournaments (run after you have real accounts)
-- ============================================================
-- 1. Sign up a few test accounts (email/password or magic link) through the app.
-- 2. Find their profile ids: select id, username from public.profiles;
-- 3. Fill in the placeholders below and run this block manually.
--
-- insert into public.communities (name, slug, description, province_id, owner_id)
-- values (
--   'Metro Bey League',
--   'metro-bey-league',
--   'Metro Manila''s flagship Beyblade X community.',
--   (select id from public.provinces where name = 'Metro Manila'),
--   '00000000-0000-0000-0000-000000000000' -- replace with a real profile id
-- );
--
-- insert into public.tournaments (
--   organizer_id, community_id, type_id, title, slug, short_description,
--   description, rules, battle_type, tournament_type, status, bracket_format,
--   starts_at, location_name, province_id, prize_pool
-- ) values (
--   '00000000-0000-0000-0000-000000000000', -- replace with a real profile id
--   (select id from public.communities where slug = 'metro-bey-league'),
--   (select id from public.tournament_types where code = 'major'),
--   'Metro Manila Open X',
--   'metro-manila-open-x',
--   'The flagship season opener for Metro Manila bladers.',
--   'Full description here.',
--   '3-point match format. Only official Beyblade X parts allowed.',
--   'solo', 'major', 'published', 'single_elimination',
--   now() + interval '6 days',
--   'SM Megamall Event Center',
--   (select id from public.provinces where name = 'Metro Manila'),
--   15000
-- );
