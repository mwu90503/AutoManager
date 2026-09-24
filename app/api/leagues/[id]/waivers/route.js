import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getWaiverRecommendations } from '@/lib/waiverWire';

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

  try {
    const result = await getWaiverRecommendations(league);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
