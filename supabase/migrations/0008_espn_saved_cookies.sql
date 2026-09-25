-- ESPN session cookies (espn_s2/SWID), encrypted at the application
-- layer (AES-256-GCM, key held only in Vercel env vars - never in this
-- database) before being stored, so scheduled refresh can keep an ESPN
-- league's roster current the same way Sleeper leagues already do.
alter table leagues add column if not exists espn_s2_encrypted text;
alter table leagues add column if not exists espn_swid_encrypted text;
