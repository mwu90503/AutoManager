import { NextResponse } from 'next/server';
import { getActiveLeagueAnalyses } from '@/lib/rosterRecommendations';
import { getWaiverRecommendations } from '@/lib/waiverWire';
import { formatDigestEmail } from '@/lib/emailFormat';
import { sendEmail } from '@/lib/ses';

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET`.
// Fires Tue/Thu/Sun; always sends regardless of content ("no matter what").
// Tuesday covers roster housekeeping + waiver wire pickups; Thu/Sun run
// through the actual starting lineup.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const day = new Date().getUTCDay(); // 0 = Sunday, 2 = Tuesday, 4 = Thursday
  const variant = day === 2 ? 'housekeeping' : 'lineup';
  const subject =
    variant === 'housekeeping' ? 'AutoManager: Roster housekeeping' : 'AutoManager: Lineup check';

  const leagueResults = await getActiveLeagueAnalyses();

  if (variant === 'housekeeping') {
    for (const result of leagueResults) {
      try {
        const { recommendations } = await getWaiverRecommendations(result.league);
        result.roster.waiverRecommendations = recommendations;
      } catch {
        // Search/LLM hiccup shouldn't block the rest of the digest.
        result.roster.waiverRecommendations = [];
      }
    }
  }

  const { text } = formatDigestEmail(leagueResults, variant, subject);

  await sendEmail({ subject, text });

  return NextResponse.json({ sent: true, variant, leagues: leagueResults.length });
}
