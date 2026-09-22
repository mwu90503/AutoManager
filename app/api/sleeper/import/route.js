import { NextResponse } from 'next/server';
import { importLeague } from '@/lib/sleeperImport';

export async function POST(request) {
  const { leagueId, sleeperUserId, username } = await request.json();
  if (!leagueId || !sleeperUserId || !username) {
    return NextResponse.json(
      { error: 'leagueId, sleeperUserId, and username are required' },
      { status: 400 }
    );
  }

  try {
    const result = await importLeague({ leagueId, sleeperUserId, username });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
