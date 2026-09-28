-- Sleeper's own depth chart tracking, used to detect when a bench
-- player's real-life competition ahead of them gets hurt (e.g. Ollie
-- Gordon becoming Miami's lead back after Achane's injury) - a faster
-- signal than waiting for weekly projections to catch up.
alter table sleeper_players add column if not exists depth_chart_position text;
alter table sleeper_players add column if not exists depth_chart_order integer;
