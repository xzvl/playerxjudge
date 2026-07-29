-- Extensions
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "pg_trgm" with schema public;

-- Enums
create type public.user_role as enum (
  'guest', 'player', 'judge', 'organizer', 'sponsor', 'admin', 'super_admin'
);

create type public.subscription_plan as enum ('free', 'premium');

create type public.subscription_status as enum ('active', 'past_due', 'cancelled', 'expired');

create type public.battle_type as enum ('solo', '2v2', '3v3', '4v4', '5v5');

create type public.tournament_type as enum ('casual', 'minor', 'major', 'emergency');

create type public.tournament_status as enum (
  'draft', 'published', 'registration_open', 'registration_closed',
  'ongoing', 'completed', 'cancelled'
);

create type public.bracket_format as enum (
  'single_elimination', 'double_elimination', 'round_robin', 'swiss'
);

create type public.registration_status as enum (
  'pending', 'confirmed', 'checked_in', 'withdrawn', 'disqualified'
);

create type public.match_status as enum ('scheduled', 'ongoing', 'completed', 'disputed');

create type public.notification_type as enum (
  'tournament_update', 'registration', 'match_result', 'announcement', 'system'
);

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type public.payment_method as enum ('gcash', 'maya', 'bank_transfer', 'stripe', 'paymongo');

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type public.sponsor_tier as enum ('bronze', 'silver', 'gold');
