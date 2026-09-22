-- e.g. "Questionable", "Doubtful", "Out", "IR", "PUP" — refreshed along
-- with the rest of the player dictionary in /api/sleeper/players/refresh.
alter table sleeper_players add column if not exists injury_status text;
