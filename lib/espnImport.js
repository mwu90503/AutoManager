import { supabase } from '@/lib/supabaseClient';
import { getEspnLeague } from '@/lib/espnClient';
import { buildSleeperNameIndex, bridgePlayer } from '@/lib/playerBridge';
import { PRO_TEAM_ABBR, POSITION_ABBR, LINEUP_SLOT, INJURY_STATUS } from '@/lib/espnMaps';

// Starting-slot types in a fixed, stable order (BN/IR always come after,
// matching Sleeper's own roster_positions convention).
const STARTING_SLOT_IDS = [0, 2, 4, 6, 23, 7, 16, 17]; // QB, RB, WR, TE, FLEX, SUPER_FLEX, DEF, K

function normalizeSwid(swid) {
  return (swid || '').toUpperCase();
}

// Registers a player ESPN knows about but that couldn't be bridged to a
// Sleeper player_id, so the roster still displays a real name instead
// of a bare id. Uses a synthetic "espn-<id>" id - injury status still
// works (from ESPN's own report), but years_exp/projections won't
// (Sleeper's projections endpoint doesn't know this id).
async function upsertUnbridgedPlayer(espnPlayer) {
  const syntheticId = `espn-${espnPlayer.id}`;
  await supabase.from('sleeper_players').upsert(
    {
      player_id: syntheticId,
      full_name: espnPlayer.fullName,
      position: POSITION_ABBR[espnPlayer.defaultPositionId] || null,
      team: PRO_TEAM_ABBR[espnPlayer.proTeamId] || null,
      injury_status: INJURY_STATUS[espnPlayer.injuryStatus] ?? null,
      years_exp: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' }
  );
  return syntheticId;
}

// Pulls a league + every team's roster from ESPN, bridges each player
// to our Sleeper-keyed player data where possible, and upserts into the
// same leagues/rosters tables the Sleeper import uses - so every
// existing feature (Recommendations, OSINT, waiver scan, emails) works
// on an ESPN league without any changes.
export async function importEspnLeague({ leagueId, season, username }) {
  const league = await getEspnLeague(leagueId, season);
  const nameIndex = await buildSleeperNameIndex();

  const mySwid = normalizeSwid(process.env.ESPN_SWID);
  const myTeam = league.teams.find((t) => (t.owners || []).some((o) => normalizeSwid(o) === mySwid));

  const slotCounts = league.settings?.rosterSettings?.lineupSlotCounts || {};
  const startingSlots = STARTING_SLOT_IDS.flatMap((slotId) =>
    Array(slotCounts[slotId] || 0).fill(LINEUP_SLOT[slotId])
  );
  const benchCount = slotCounts[20] || 0;
  const irCount = slotCounts[21] || 0;
  const roster_positions = [...startingSlots, ...Array(benchCount).fill('BN'), ...Array(irCount).fill('IR')];

  const { data: leagueRow, error: leagueError } = await supabase
    .from('leagues')
    .upsert(
      {
        provider: 'espn',
        espn_league_id: String(leagueId),
        espn_season: String(season),
        sleeper_league_id: null,
        name: league.settings?.name || `ESPN League ${leagueId}`,
        season: String(season),
        scoring_settings: null, // falls back to pts_ppr/half/std buckets in projectedPoints()
        roster_positions,
        settings: {
          reserve_slots: irCount,
          reserve_allow_out: 1,
          reserve_allow_doubtful: 0,
        },
        imported_by_username: username,
        imported_by_sleeper_user_id: null,
      },
      { onConflict: 'espn_league_id,espn_season' }
    )
    .select()
    .single();

  if (leagueError) {
    throw new Error(leagueError.message);
  }

  const rosterRows = [];
  for (const team of league.teams) {
    const players = [];
    const starterBySlot = {};
    const reserve = [];

    for (const entry of team.roster?.entries || []) {
      const p = entry.playerPoolEntry.player;
      const bridgedId = bridgePlayer(nameIndex, {
        espnId: p.id,
        name: p.fullName,
        team: PRO_TEAM_ABBR[p.proTeamId],
        position: POSITION_ABBR[p.defaultPositionId],
      });
      const id = bridgedId || (await upsertUnbridgedPlayer(p));

      players.push(id);
      if (entry.lineupSlotId === 21) {
        reserve.push(id);
      } else if (entry.lineupSlotId !== 20) {
        const slotName = LINEUP_SLOT[entry.lineupSlotId];
        (starterBySlot[slotName] ||= []).push(id);
      }
    }

    // Lay starters out in the same order as roster_positions' starting
    // slots, "0" for any empty slot - matches how Sleeper represents an
    // unfilled starter, so the existing empty-slot alert works as-is.
    const starterSlotCounts = {};
    const starters = startingSlots.map((slotName) => {
      const i = (starterSlotCounts[slotName] ||= 0);
      starterSlotCounts[slotName]++;
      return (starterBySlot[slotName] || [])[i] || '0';
    });

    rosterRows.push({
      league_id: leagueRow.id,
      sleeper_roster_id: team.id,
      sleeper_owner_id: (team.owners || [])[0] || null,
      team_name: team.name,
      players,
      starters,
      reserve,
      taxi: [],
      wins: team.record?.overall?.wins || 0,
      losses: team.record?.overall?.losses || 0,
      ties: team.record?.overall?.ties || 0,
      is_own_team: myTeam ? team.id === myTeam.id : false,
    });
  }

  const { data: savedRosters, error: rosterError } = await supabase
    .from('rosters')
    .upsert(rosterRows, { onConflict: 'league_id,sleeper_roster_id' })
    .select();

  if (rosterError) {
    throw new Error(rosterError.message);
  }

  return {
    league: leagueRow,
    rosters: savedRosters,
    ownRoster: savedRosters.find((r) => r.is_own_team) || null,
  };
}
