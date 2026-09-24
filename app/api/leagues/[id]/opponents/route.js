import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Other teams in this league, straight from our own stored rosters -
// no live Sleeper call needed just to list who's in the league.
export async function GET(_request, { params }) {
  const { id } = await params;

  const { data: rosters, error } = await supabase
    .from('rosters')
    .select('sleeper_owner_id, team_name, is_own_team, wins, losses, ties')
    .eq('league_id', id)
    .eq('is_own_team', false)
    .order('team_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    rosters
      .filter((r) => r.sleeper_owner_id)
      .map((r) => ({
        ownerId: r.sleeper_owner_id,
        teamName: r.team_name || r.sleeper_owner_id,
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
      }))
  );
}
