-- One-time backfill for accounts that existed before
-- 20250101000051_google_username_generation.sql — that migration only
-- changed handle_new_user, which fires on *new* signups; this catches up
-- rows already sitting in the table. Safe to run more than once (both
-- halves only touch rows that still look untouched).

-- provider: was NULL for every pre-existing row (ALTER TABLE ADD COLUMN
-- doesn't backfill) — read it back from the auth user's own metadata, same
-- source handle_new_user now uses for new signups. Purely informational
-- (surfaced on /backend/players), so no scoping concerns here.
update public.profiles pr
set provider = coalesce(au.raw_app_meta_data->>'provider', 'email')
from auth.users au
where pr.id = au.id and pr.provider is null;

-- username: only rows still holding the exact old meaningless fallback
-- ('user_' || first 8 chars of the id, see the original
-- 20250101000002_core_tables.sql handle_new_user) get rewritten — never a
-- username a real person actually typed at signup (registerSchema requires
-- one, and it can't collide with this pattern by construction: the
-- profiles_username_format check allows underscores but a person choosing
-- "user_xxxxxxxx" that happens to also match 8 lowercase-hex characters is
-- vanishingly unlikely and, either way, indistinguishable from the fallback
-- by design). One row at a time (not a set-based UPDATE) so each
-- candidate's uniqueness check sees the previous rows already renamed in
-- this same pass, same dedup shape as handle_new_user itself.
do $$
declare
  r record;
  base_username text;
  candidate_username text;
  attempt int;
begin
  for r in
    select pr.id, au.email
    from public.profiles pr
    join auth.users au on au.id = pr.id
    where pr.username ~ '^user_[0-9a-f]{8}$'
  loop
    base_username := lower(regexp_replace(split_part(coalesce(r.email, ''), '@', 1), '[^a-z0-9_]', '', 'g'));
    if length(base_username) < 3 then
      continue; -- no better name available than what it already has
    end if;
    base_username := left(base_username, 24);
    candidate_username := base_username;
    attempt := 0;

    while exists (select 1 from public.profiles where username = candidate_username and id <> r.id) loop
      attempt := attempt + 1;
      if attempt > 20 then
        candidate_username := null;
        exit;
      end if;
      candidate_username := left(base_username, 18) || '_' || substr(md5(random()::text), 1, 4);
    end loop;

    if candidate_username is not null then
      update public.profiles set username = candidate_username where id = r.id;
    end if;
  end loop;
end $$;
