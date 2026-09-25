-- Maps a Cognito username (the opaque id used everywhere as
-- imported_by_username) to the real email address that account signed
-- up with, so scheduled digests and the "email me" button can actually
-- reach each person - every league/roster is keyed to the opaque
-- username, which Cognito never exposes as an email.
create table if not exists app_users (
  username text primary key,
  email text not null,
  updated_at timestamptz not null default now()
);

alter table app_users disable row level security;
