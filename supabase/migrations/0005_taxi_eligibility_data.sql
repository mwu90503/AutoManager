-- League settings (needed for taxi_years/taxi_slots eligibility rules) and
-- each player's years of NFL experience (needed to check taxi eligibility).
alter table leagues add column if not exists settings jsonb;
alter table sleeper_players add column if not exists years_exp integer;
