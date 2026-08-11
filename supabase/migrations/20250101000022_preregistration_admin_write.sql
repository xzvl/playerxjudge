-- Organizer/admin write access to pre-registration rows — edit and remove
-- from the /pre-register admin table — alongside the existing
-- insert-public/select-organizer policies from
-- 20250101000020_preregistration_payment.sql.
create policy "tournament_preregistrations_update_organizer" on public.tournament_preregistrations for update
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin());

create policy "tournament_preregistrations_delete_organizer" on public.tournament_preregistrations for delete
  using (public.is_organizer_of_tournament(tournament_id) or public.is_admin());
