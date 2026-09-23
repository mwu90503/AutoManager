import { NextResponse } from 'next/server';
import { getActiveLeagueAnalyses } from '@/lib/rosterRecommendations';
import { formatDigestEmail, hasContentForVariant } from '@/lib/emailFormat';
import { sendEmail } from '@/lib/ses';

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET`.
// Fires daily, but only actually sends when at least one league has a
// "0-point starter" issue (empty slot, Out/IR/PUP/Doubtful, or bye) -
// repeats every day the problem persists, and goes quiet on its own
// once it's fixed since each run re-checks the live roster.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leagueResults = await getActiveLeagueAnalyses();
  const withIssues = leagueResults.filter(({ roster }) => hasContentForVariant(roster, 'critical'));

  if (!withIssues.length) {
    return NextResponse.json({ sent: false, reason: 'no critical issues' });
  }

  const subject = 'AutoManager: You have a 0-point starter';
  const { text } = formatDigestEmail(withIssues, 'critical', subject);
  await sendEmail({ subject, text });

  return NextResponse.json({ sent: true, leagues: withIssues.length });
}
