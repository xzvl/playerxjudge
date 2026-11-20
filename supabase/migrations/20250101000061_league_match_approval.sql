-- League match approval: matches logged by members/fillers stay "pending"
-- (out of standings and the public page) until the owner, captain or a
-- sub-captain approves them. Matches logged by a manager are approved at once.

alter table public.team_league_matches
  add column status text not null default 'approved',
  add column approved_by uuid references public.profiles(id) on delete set null,
  add column approved_at timestamptz,
  add constraint team_league_matches_status check (status in ('pending', 'approved'));

create index team_league_matches_status_idx on public.team_league_matches (league_id, status);

-- Non-managers can never approve (not even their own match): anything they
-- insert or edit goes back to pending. Managers' rows are stamped on approval.
create or replace function public.guard_league_match_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_mgr boolean;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  is_mgr := public.is_team_manager(public.team_of_league(new.league_id));

  if not is_mgr then
    new.status := 'pending';
    new.approved_by := null;
    new.approved_at := null;
  elsif new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif new.status = 'pending' then
    new.approved_by := null;
    new.approved_at := null;
  end if;

  return new;
end;
$$;

create trigger guard_league_match_status
  before insert or update on public.team_league_matches
  for each row execute function public.guard_league_match_status();
