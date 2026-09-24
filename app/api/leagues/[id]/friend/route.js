import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { analyzeFriendRoster } from '@/lib/rosterRecommendations';

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .single();

  if (leagueError) {
    return NextResponse.json({ error: leagueError.message }, { status: 404 });
  }

  try {
    const result = await analyzeFriendRoster(league, username);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
