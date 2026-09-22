import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { positionRank } from '@/lib/positionOrder';

export async function GET(_request, { params }) {
  const { id } = await params;

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single();

  if (leagueError) {
    return NextResponse.json({ error: leagueError.message }, { status: 404 });
  }

  const { data: roster, error: rosterError } = await supabase
    .from('rosters')
    .select('*')
    .eq('league_id', id)
    .eq('is_own_team', true)
    .single();

  if (rosterError) {
    return NextResponse.json({ error: rosterError.message }, { status: 404 });
  }

  const allIds = Array.from(
    new Set([...(roster.players || []), ...(roster.reserve || []), ...(roster.taxi || [])])
  );

  const { data: players, error: playersError } = await supabase
    .from('sleeper_players')
    .select('player_id, full_name, position, team, injury_status')
    .in('player_id', allIds.length ? allIds : ['']);

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const playerById = new Map(players.map((p) => [p.player_id, p]));
  const resolve = (pid) =>
    playerById.get(pid) || { player_id: pid, full_name: pid, position: null, team: null, injury_status: null };

  const starterIds = roster.starters || [];
  const reserveIds = roster.reserve || [];
  const taxiIds = roster.taxi || [];
  const starterSet = new Set(starterIds);
  const reserveSet = new Set(reserveIds);
  const taxiSet = new Set(taxiIds);

  // Sleeper's `starters` array lines up index-for-index with the
  // non-bench/IR slots in the league's roster_positions, in the same
  // order Sleeper's own UI shows them (QB, RB, RB, WR, ...).
  const startingSlots = (league.roster_positions || []).filter(
    (p) => p !== 'BN' && p !== 'IR' && p !== 'TAXI'
  );
  const starters = starterIds.map((pid, i) => ({ slot: startingSlots[i] || 'FLEX', ...resolve(pid) }));

  const byPosition = (a, b) => positionRank(a.position) - positionRank(b.position);

  const bench = (roster.players || [])
    .filter((pid) => !starterSet.has(pid) && !reserveSet.has(pid) && !taxiSet.has(pid))
    .map(resolve)
    .sort(byPosition);

  const ir = reserveIds.map(resolve).sort(byPosition);
  const taxi = taxiIds.map(resolve).sort(byPosition);

  return NextResponse.json({
    league,
    roster: { ...roster, starters, bench, ir, taxi },
  });
}
