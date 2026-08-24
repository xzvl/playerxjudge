-- Lets any visitor (including anonymous ones, who have no update rights on
-- `tournaments` under tournaments_update_organizer_or_admin) bump a single
-- tournament's view_count from the public player view. security definer so
-- it can perform the update despite the caller failing that RLS policy,
-- while still only ever touching the one counter column on the one row it's
-- told to — not a general-purpose tournaments update escape hatch.
create or replace function public.increment_tournament_view_count(target_tournament_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.tournaments
  set view_count = view_count + 1
  where id = target_tournament_id;
$$;
