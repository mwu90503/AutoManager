import { NextResponse } from 'next/server';
import { importEspnLeague } from '@/lib/espnImport';

export async function POST(request) {
  const { leagueId, season, username } = await request.json();
  if (!leagueId || !season || !username) {
    return NextResponse.json({ error: 'leagueId, season, and username are required' }, { status: 400 });
  }

  try {
    const result = await importEspnLeague({ leagueId, season, username });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
