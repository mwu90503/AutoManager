import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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

  const playerIds = roster.players || [];
  const { data: players, error: playersError } = await supabase
    .from('sleeper_players')
    .select('player_id, full_name, position, team')
    .in('player_id', playerIds.length ? playerIds : ['']);

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const playerById = new Map(players.map((p) => [p.player_id, p]));
  const resolvedPlayers = playerIds.map(
    (pid) => playerById.get(pid) || { player_id: pid, full_name: pid, position: null, team: null }
  );

  return NextResponse.json({ league, roster: { ...roster, resolvedPlayers } });
}
