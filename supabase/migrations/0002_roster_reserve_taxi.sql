-- IR (reserve) and taxi squad player_ids, same shape as `players`/`starters`.
alter table rosters add column if not exists reserve jsonb not null default '[]';
alter table rosters add column if not exists taxi jsonb not null default '[]';
