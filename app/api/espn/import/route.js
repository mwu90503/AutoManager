import { NextResponse } from 'next/server';
import { importEspnLeague } from '@/lib/espnImport';

export async function POST(request) {
  const { leagueId, season, username, espnS2, swid } = await request.json();
  if (!leagueId || !season || !username || !espnS2 || !swid) {
    return NextResponse.json(
      { error: 'leagueId, season, username, espnS2, and swid are all required' },
      { status: 400 }
    );
  }

  try {
    const result = await importEspnLeague({ leagueId, season, username, espnS2, swid });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
