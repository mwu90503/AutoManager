import { supabase } from '@/lib/supabaseClient';

function normalizeName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[.'-]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Everything else in the app (injury status, bye weeks, projections,
// OSINT, waiver scanning) is keyed to Sleeper's player_id. Bridging an
// external provider's player into that id lets a whole other league's
// roster plug into every feature already built, unchanged.
const PAGE_SIZE = 1000;

export async function buildSleeperNameIndex() {
  // Supabase's REST API caps an unpaginated query at 1000 rows by
  // default - the cache has ~12k players, so this needs to actually
  // page through everything or the index silently only covers ~8% of
  // real players (confirmed: this was why nearly every ESPN player
  // failed to bridge in initial testing, even ones with obvious exact
  // Sleeper matches).
  const players = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('sleeper_players')
      .select('player_id, full_name, position, team, espn_id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    players.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const byEspnId = new Map();
  const byName = new Map();
  for (const p of players) {
    if (p.espn_id) byEspnId.set(String(p.espn_id), p);
    const key = normalizeName(p.full_name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(p);
  }
  return { byEspnId, byName };
}

// Resolves one external player to our Sleeper player_id: espn_id first
// (sparse but exact when present), then name match, disambiguated by
// team/position if the name alone is ambiguous (e.g. two "Josh Allen"s
// across the league - the QB and the Jaguars DE).
export function bridgePlayer(index, { espnId, name, team, position }) {
  if (espnId && index.byEspnId.has(String(espnId))) {
    return index.byEspnId.get(String(espnId)).player_id;
  }

  const candidates = index.byName.get(normalizeName(name)) || [];
  if (candidates.length === 1) return candidates[0].player_id;
  if (candidates.length > 1) {
    const narrowed = candidates.filter((c) => (!team || c.team === team) && (!position || c.position === position));
    if (narrowed.length >= 1) return narrowed[0].player_id;
  }
  return null;
}
