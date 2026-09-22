import { NextResponse } from 'next/server';
import { getUserByUsername, getLeaguesForUser } from '@/lib/sleeperClient';
import { currentSleeperSeason } from '@/lib/sleeperSeason';

export async function POST(request) {
  const { username } = await request.json();
  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 });
  }

  const user = await getUserByUsername(username).catch(() => null);
  if (!user) {
    return NextResponse.json({ error: 'No Sleeper user with that username' }, { status: 404 });
  }

  const season = currentSleeperSeason();
  const leagues = await getLeaguesForUser(user.user_id, season);

  return NextResponse.json({
    sleeperUserId: user.user_id,
    season,
    leagues: leagues.map((league) => ({
      id: league.league_id,
      name: league.name,
    })),
  });
}
