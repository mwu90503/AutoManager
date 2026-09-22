const BASE_URL = 'https://api.sleeper.app/v1';

async function sleeperGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API ${path} failed: ${res.status}`);
  }
  return res.json();
}

export function getUserByUsername(username) {
  return sleeperGet(`/user/${encodeURIComponent(username)}`);
}

export function getLeaguesForUser(sleeperUserId, season) {
  return sleeperGet(`/user/${sleeperUserId}/leagues/nfl/${season}`);
}

export function getLeague(leagueId) {
  return sleeperGet(`/league/${leagueId}`);
}

export function getRosters(leagueId) {
  return sleeperGet(`/league/${leagueId}/rosters`);
}

export function getLeagueUsers(leagueId) {
  return sleeperGet(`/league/${leagueId}/users`);
}

export function getAllPlayers() {
  return sleeperGet('/players/nfl');
}
