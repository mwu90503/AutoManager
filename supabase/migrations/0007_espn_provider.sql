-- Multi-provider support. sleeper_league_id/sleeper_roster_id/
-- sleeper_owner_id are reused as generic "external id from whichever
-- provider" fields for ESPN rows too, rather than adding parallel
-- espn_* columns everywhere - the values are just opaque identifiers to
-- the rest of the app either way.
alter table leagues alter column sleeper_league_id drop not null;
alter table leagues add column if not exists provider text not null default 'sleeper';
alter table leagues add column if not exists espn_league_id text;
alter table leagues add column if not exists espn_season text;

create unique index if not exists leagues_espn_unique
  on leagues (espn_league_id, espn_season)
  where provider = 'espn';

-- Sleeper's own player dictionary includes espn_id for some players
-- (sparsely - confirmed ~25% coverage), used as a first-pass bridge
-- before falling back to name+team matching.
alter table sleeper_players add column if not exists espn_id text;
