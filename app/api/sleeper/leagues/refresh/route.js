import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { importLeague } from '@/lib/sleeperImport';
import { isInSeason } from '@/lib/sleeperSeason';

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET`.
// Vercel's Hobby plan caps cron jobs at once a day, so this fires daily
// and self-throttles further in the offseason: every day during the
// season (Aug-Jan), but only on Mondays the rest of the year, since
// nothing changes when nobody's setting lineups or working waivers.
// (Upgrading to Pro would allow firing - and refreshing - more than once
// a day during the season, if that's ever worth it.)
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  if (!isInSeason(now) && now.getUTCDay() !== 1) {
    return NextResponse.json({ skipped: 'offseason, weekly run only (Mondays)' });
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
