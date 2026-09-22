-- The importer's Sleeper user_id, stored so a scheduled refresh (no live
-- client session) can still tell which roster is "ours" via is_own_team.
alter table leagues add column if not exists imported_by_sleeper_user_id text;
