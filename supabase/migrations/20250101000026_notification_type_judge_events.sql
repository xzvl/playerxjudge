-- ============================================================
-- inviteJudge/respondToJudgeInvite (app/account/organizer/tournament/[slug]/
-- judges-actions.ts, app/account/notifications-actions.ts) insert
-- notifications with type 'judge_invite' / 'judge_response' — but
-- notifications.type is the fixed public.notification_type enum
-- ('tournament_update', 'registration', 'match_result', 'announcement',
-- 'system'), so every one of those inserts was rejected outright (and
-- silently swallowed — nothing checked the insert's error). Judges never
-- actually got invited.
-- ============================================================

alter type public.notification_type add value if not exists 'judge_invite';
alter type public.notification_type add value if not exists 'judge_response';
