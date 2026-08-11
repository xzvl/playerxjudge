-- The Province field on the tournament wizard/settings Location section goes
-- back to free text (fed by an address-autocomplete lookup instead of a
-- fixed `provinces` table dropdown) — a plain string travels naturally with
-- whatever a free geocoding API returns, whereas matching that back to a
-- `provinces.id` UUID would require fuzzy-matching province names anyway.
-- `province_id` / the `provinces` reference table are left in place (already
-- vestigial elsewhere in this app) — just no longer written to by the wizard.
alter table public.tournaments add column if not exists province text;
