-- Cache of Sleeper's NFL player dictionary (player_id -> name/position/team).
-- Refreshed periodically via /api/sleeper/players/refresh; roster jsonb only
-- stores player_ids, this table is what turns them into readable names.
create table if not exists sleeper_players (
  player_id text primary key,
  full_name text,
  position text,
  team text,
  updated_at timestamptz not null default now()
);

-- A Sleeper league imported by an AutoManager user.
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  sleeper_league_id text not null unique,
  name text not null,
  season text not null,
  scoring_settings jsonb,
  roster_positions jsonb,
  imported_by_username text not null,
  created_at timestamptz not null default now()
);

create index if not exists leagues_imported_by_idx on leagues(imported_by_username);

-- One team's roster within an imported league. `players` and `starters`
-- are arrays of Sleeper player_ids, same shape Sleeper's API returns them in.
create table if not exists rosters (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id) on delete cascade,
  sleeper_roster_id integer not null,
  sleeper_owner_id text,
  team_name text,
  players jsonb not null default '[]',
  starters jsonb not null default '[]',
  wins integer not null default 0,
  losses integer not null default 0,
  ties integer not null default 0,
  is_own_team boolean not null default false,
  created_at timestamptz not null default now(),
  unique (league_id, sleeper_roster_id)
);

create index if not exists rosters_league_id_idx on rosters(league_id);

-- Auth is Cognito, not Supabase Auth, so there's no auth.uid() for RLS
-- policies to key off. Access control happens in the Next.js API routes,
-- consistent with the existing `users` table.
alter table sleeper_players disable row level security;
alter table leagues disable row level security;
alter table rosters disable row level security;
