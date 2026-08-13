-- ============================================================
-- Wires up the `judges` table (scaffolded in
-- 20250101000003_tournament_tables.sql but never used by the app): adds
-- the invite-confirm-remove lifecycle and per-station assignment behind
-- the organizer Stations page's new Judges section.
-- ============================================================

alter table public.judges
  add column status public.judge_assignment_status not null default 'pending',
  add column decided_at timestamptz,
  add column station_id uuid references public.tournament_stations(id) on delete set null;

-- "1 station : 1 judge" — a station can only ever be `station_id` on one
-- judges row at a time. Since `station_id` is a single column per judge
-- row, this also caps a judge to one station.
create unique index judges_station_id_unique on public.judges (station_id) where station_id is not null;

create index judges_tournament_status_idx on public.judges (tournament_id, status);

-- The organizer's existing "judges_write_organizer_or_admin" (for all)
-- policy covers inviting (insert) and removing (delete) a judge from their
-- own tournament's roster. This adds the missing half: the invited judge
-- accepting/declining their own row.
create policy "judges_update_self" on public.judges for update
  using (judge_id = auth.uid())
  with check (judge_id = auth.uid());

-- Lets a judge invite (organizer -> judge) and its response (judge ->
-- organizer) create a `notifications` row for the other party, scoped
-- strictly to tournaments they actually share a `judges` row on.
create policy "notifications_insert_tournament_judge_link" on public.notifications for insert
  with check (
    exists (
      select 1 from public.judges j
      join public.tournaments t on t.id = j.tournament_id
      where (t.organizer_id = auth.uid() and j.judge_id = profile_id)
         or (j.judge_id = auth.uid() and t.organizer_id = profile_id)
    )
  );
