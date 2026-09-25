import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { importEspnLeague } from '@/lib/espnImport';
import { decrypt } from '@/lib/cookieEncryption';

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET`.
// Re-imports every ESPN league that has saved (encrypted) cookies, the
// same way the Sleeper leagues/refresh cron keeps those current. A
// league whose cookies have expired (password changed, logged out
// everywhere) just fails that one league and gets reported, not
// retried automatically - re-importing through the UI refreshes them.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('espn_league_id, espn_season, imported_by_username, espn_s2_encrypted, espn_swid_encrypted')
    .eq('provider', 'espn')
    .not('espn_s2_encrypted', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = { refreshed: [], failed: [] };

  for (const league of leagues) {
    try {
      const espnS2 = decrypt(league.espn_s2_encrypted);
      const swid = decrypt(league.espn_swid_encrypted);
      await importEspnLeague({
        leagueId: league.espn_league_id,
        season: league.espn_season,
        username: league.imported_by_username,
        espnS2,
        swid,
      });
      results.refreshed.push(league.espn_league_id);
    } catch (err) {
      results.failed.push({ league: league.espn_league_id, error: err.message });
    }
  }

  return NextResponse.json(results);
}
