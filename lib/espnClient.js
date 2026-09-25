// ESPN publishes no public fantasy API - this is the same private,
// undocumented endpoint their own site calls. Requires the account
// owner's own session cookies (espn_s2 + SWID), passed in per-call
// rather than a single app-wide credential - each person importing a
// league uses their own ESPN login, not a shared account. A plain fetch
// without a browser-like User-Agent gets redirected as if
// unauthenticated even with valid cookies (confirmed empirically).
const HOST = 'https://lm-api-reads.fantasy.espn.com';

function authHeaders(espnS2, swid) {
  if (!espnS2 || !swid) {
    throw new Error('ESPN cookies (espn_s2 and SWID) are required');
  }
  return {
    Cookie: `espn_s2=${espnS2}; SWID=${swid}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

export async function getEspnLeague(leagueId, season, { espnS2, swid }) {
  const url = `${HOST}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings`;
  const res = await fetch(url, { headers: authHeaders(espnS2, swid) });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403 || res.status === 404
        ? "Couldn't access that league. Double-check the league ID, and that your cookies are current and belong to an account that's actually a member of this league."
        : `ESPN league fetch failed: ${res.status}`
    );
  }
  return res.json();
}

// Free agents / waiver-wire pool for the league, page by page (ESPN
// caps each response). Used to build the same "who's actually
// available" cross-reference the waiver scan already does for Sleeper.
export async function getEspnFreeAgents(leagueId, season, { espnS2, swid, limit = 200 } = {}) {
  const url = `${HOST}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=kona_player_info`;
  const res = await fetch(url, {
    headers: {
      ...authHeaders(espnS2, swid),
      'X-Fantasy-Filter': JSON.stringify({
        players: {
          filterStatus: { value: ['FREEAGENT', 'WAIVERS'] },
          limit,
          sortPercOwned: { sortAsc: false, sortPriority: 1 },
        },
      }),
    },
  });
  if (!res.ok) {
    throw new Error(`ESPN free agents fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.players || [];
}
