-- ============================================================
-- Match screenshots: the judge console's Submit Result captures the whole
-- console page as a screenshot at the moment of submission and stores it
-- here — proof of what was reported, surfaced by the organizer's
-- MatchDetailsDialog (score.screenshotUrl, which was already rendered
-- there but never actually produced by anything until now).
--
-- One object per match — `${tournament_id}/${match_id}.webp`, overwritten
-- on re-submit (see uploadMatchScreenshot in
-- app/tournaments/[slug]/judge/actions.ts). Public read, same "not linked
-- from anywhere public" reasoning as preregistration-payments; write is
-- restricted to that tournament's organizer or an approved judge of it.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('match-screenshots', 'match-screenshots', true)
on conflict (id) do nothing;

create policy "match_screenshots_public_read" on storage.objects for select
  using (bucket_id = 'match-screenshots');

create policy "match_screenshots_judge_or_organizer_write" on storage.objects for insert
  with check (
    bucket_id = 'match-screenshots'
    and (
      public.is_organizer_of_tournament(((storage.foldername(name))[1])::uuid)
      or public.is_judge_of_tournament(((storage.foldername(name))[1])::uuid)
      or public.is_admin()
    )
  );

create policy "match_screenshots_judge_or_organizer_update" on storage.objects for update
  using (
    bucket_id = 'match-screenshots'
    and (
      public.is_organizer_of_tournament(((storage.foldername(name))[1])::uuid)
      or public.is_judge_of_tournament(((storage.foldername(name))[1])::uuid)
      or public.is_admin()
    )
  );
