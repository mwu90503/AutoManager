import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getLeague, getRosters, getLeagueUsers } from '@/lib/sleeperClient';

export async function POST(request) {
  const { leagueId, sleeperUserId, username } = await request.json();
  if (!leagueId || !sleeperUserId || !username) {
    return NextResponse.json(
      { error: 'leagueId, sleeperUserId, and username are required' },
      { status: 400 }
    );
  }

  const [league, rosters, leagueUsers] = await Promise.all([
    getLeague(leagueId),
    getRosters(leagueId),
    getLeagueUsers(leagueId),
  ]);

  const teamNameByOwnerId = new Map(
    leagueUsers.map((u) => [u.user_id, u.metadata?.team_name || u.display_name])
  );

  const { data: leagueRow, error: leagueError } = await supabase
    .from('leagues')
    .upsert(
      {
        sleeper_league_id: league.league_id,
        name: league.name,
        season: league.season,
        scoring_settings: league.scoring_settings,
        roster_positions: league.roster_positions,
        imported_by_username: username,
      },
      { onConflict: 'sleeper_league_id' }
    )
    .select()
    .single();

  if (leagueError) {
    return NextResponse.json({ error: leagueError.message }, { status: 500 });
  }

  const rosterRows = rosters.map((r) => ({
    league_id: leagueRow.id,
    sleeper_roster_id: r.roster_id,
    sleeper_owner_id: r.owner_id,
    team_name: teamNameByOwnerId.get(r.owner_id) || null,
    players: r.players || [],
    starters: r.starters || [],
    reserve: r.reserve || [],
    taxi: r.taxi || [],
    wins: r.settings?.wins || 0,
    losses: r.settings?.losses || 0,
    ties: r.settings?.ties || 0,
    is_own_team: r.owner_id === sleeperUserId,
  }));

  const { data: savedRosters, error: rosterError } = await supabase
    .from('rosters')
    .upsert(rosterRows, { onConflict: 'league_id,sleeper_roster_id' })
    .select();

  if (rosterError) {
    return NextResponse.json({ error: rosterError.message }, { status: 500 });
  }

  return NextResponse.json({
    league: leagueRow,
    rosters: savedRosters,
    ownRoster: savedRosters.find((r) => r.is_own_team) || null,
  });
}
