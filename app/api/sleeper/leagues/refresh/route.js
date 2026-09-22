import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { importLeague } from '@/lib/sleeperImport';
import { isInSeason } from '@/lib/sleeperSeason';

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET`.
// Scheduled to fire every 6 hours; outside the season it only actually
// refreshes once a day (the midnight-UTC firing) since rosters don't
// change when nobody's setting lineups or working waivers.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  if (!isInSeason(now) && now.getUTCHours() !== 0) {
    return NextResponse.json({ skipped: 'offseason, not the daily run' });
  }

  const { data: leagues, error: leaguesError } = await supabase
    .from('leagues')
    .select('sleeper_league_id, imported_by_username, imported_by_sleeper_user_id');

  if (leaguesError) {
    return NextResponse.json({ error: leaguesError.message }, { status: 500 });
  }

  const results = { refreshed: [], skipped: [], failed: [] };

  for (const league of leagues) {
    if (!league.imported_by_sleeper_user_id) {
      // Imported before this field existed - needs one manual re-import
      // to backfill it before scheduled refreshes can pick it up.
      results.skipped.push(league.sleeper_league_id);
      continue;
    }
    try {
      await importLeague({
        leagueId: league.sleeper_league_id,
        sleeperUserId: league.imported_by_sleeper_user_id,
        username: league.imported_by_username,
      });
      results.refreshed.push(league.sleeper_league_id);
    } catch (err) {
      results.failed.push({ league: league.sleeper_league_id, error: err.message });
    }
  }

  return NextResponse.json(results);
}
