-- The day's practice designation (e.g. "DNP", "Limited", "Full") from
-- Sleeper's player dictionary, sourced from official team practice
-- reports. Sparsely populated compared to injury_status, but shown
-- when available on the Thu/Sun lineup digest.
alter table sleeper_players add column if not exists practice_participation text;
