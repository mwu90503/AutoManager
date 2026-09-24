// ESPN publishes no public fantasy API - this is the same private,
// undocumented endpoint their own site calls. Requires the account
// owner's own session cookies (espn_s2 + SWID); a plain fetch without a
// browser-like User-Agent gets redirected as if unauthenticated even
// with valid cookies (confirmed empirically).
const HOST = 'https://lm-api-reads.fantasy.espn.com';

function authHeaders() {
  const s2 = process.env.ESPN_S2;
  const swid = process.env.ESPN_SWID;
  if (!s2 || !swid) {
    throw new Error('Missing ESPN_S2 or ESPN_SWID environment variables');
  }
  return {
    Cookie: `espn_s2=${s2}; SWID=${swid}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

export async function getEspnLeague(leagueId, season) {
  const url = `${HOST}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam&view=mRoster&view=mSettings`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`ESPN league fetch failed: ${res.status}`);
  }
  return res.json();
}

// Free agents / waiver-wire pool for the league, page by page (ESPN
// caps each response). Used to build the same "who's actually
// available" cross-reference the waiver scan already does for Sleeper.
export async function getEspnFreeAgents(leagueId, season, { limit = 200 } = {}) {
  const url = `${HOST}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=kona_player_info`;
  const res = await fetch(url, {
    headers: {
      ...authHeaders(),
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
