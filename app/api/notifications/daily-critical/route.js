import { NextResponse } from 'next/server';
import { getActiveLeagueAnalyses, groupResultsByUser } from '@/lib/rosterRecommendations';
import { formatDigestEmail, hasContentForVariant } from '@/lib/emailFormat';
import { sendEmail } from '@/lib/ses';
import { getEmailsForUsernames } from '@/lib/appUsers';

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET`.
// Fires daily, but only actually emails a given user when at least one
// of THEIR leagues has a "0-point starter" issue (empty slot, Out/IR/
// PUP/Doubtful, or bye) - repeats every day the problem persists, and
// goes quiet on its own once it's fixed since each run re-checks the
// live roster. Each user only ever sees their own leagues.
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
  const byUser = groupResultsByUser(withIssues);
  const emails = await getEmailsForUsernames([...byUser.keys()]);

  const sent = [];
  const skipped = [];
  for (const [username, results] of byUser) {
    const to = emails[username];
    if (!to) {
      skipped.push(username);
      continue;
    }
    const { text } = formatDigestEmail(results, 'critical', subject);
    await sendEmail({ to, subject, text });
    sent.push(username);
  }

  return NextResponse.json({ sentTo: sent.length, skipped });
}
