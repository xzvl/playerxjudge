-- ============================================================
-- Team invites (app/account/team/actions.ts → inviteToTeam) notify the
-- invited player with type 'team_invite'. Kept in its own migration, like
-- 20250101000026_notification_type_judge_events.sql: a value added with
-- `alter type ... add value` can't be used in the same transaction.
-- ============================================================

alter type public.notification_type add value if not exists 'team_invite';
