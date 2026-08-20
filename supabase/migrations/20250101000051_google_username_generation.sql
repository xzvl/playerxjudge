-- Which auth method created this account ('email' or 'google', whatever
-- Supabase Auth itself puts in raw_app_meta_data->>'provider') — surfaced on
-- /backend/players (see PlayersPanel) so staff can tell them apart. Existing
-- rows are backfilled null and read as "Email" in the UI (password was the
-- only option before Google sign-in existed here).
alter table public.profiles add column if not exists provider text;

-- Redefines handle_new_user (originally 20250101000002_core_tables.sql) to:
--   1) stamp the new `provider` column from the auth user's own metadata.
--   2) give Google (and any other non-password) sign-in a real username
--      instead of the meaningless 'user_xxxxxxxx' fallback — derived from
--      the email's local part the same way `display_name` already falls
--      back to split_part(email, '@', 1) below, deduped with a random
--      suffix on collision. Email/password sign-up is unchanged: it always
--      passes an explicit `username` in raw_user_meta_data (see signUp in
--      app/(auth)/actions.ts) and that still wins outright.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_username text := new.raw_user_meta_data->>'username';
  base_username text;
  candidate_username text;
  attempt int := 0;
begin
  if meta_username is not null and meta_username <> '' then
    candidate_username := meta_username;
  else
    base_username := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
    if length(base_username) < 3 then
      base_username := 'user_' || substr(new.id::text, 1, 8);
    end if;
    base_username := left(base_username, 24);
    candidate_username := base_username;

    -- Append a short random suffix on collision — bounded so a pathological
    -- run of collisions can't loop forever; the id-based fallback below is
    -- guaranteed unique (auth.users.id is a primary key) if it ever comes to
    -- that.
    while exists (select 1 from public.profiles where username = candidate_username) loop
      attempt := attempt + 1;
      if attempt > 20 then
        candidate_username := 'user_' || substr(new.id::text, 1, 8);
        exit;
      end if;
      candidate_username := left(base_username, 18) || '_' || substr(md5(random()::text), 1, 4);
    end loop;
  end if;

  insert into public.profiles (id, username, display_name, provider)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Resolves a username to its account email so /login can accept either (see
-- signInWithPassword in app/(auth)/actions.ts) — email itself lives on
-- auth.users, which anon/authenticated roles can't read directly, hence the
-- security definer function rather than a normal query. Deliberately narrow:
-- only usable to resolve a login attempt (returns just the email, nothing
-- else), never granted for general profile lookups.
create or replace function public.email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;
