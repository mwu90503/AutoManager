import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/ses';
import { formatDigestEmail } from '@/lib/emailFormat';
import { getEmailForUsername } from '@/lib/appUsers';

export async function POST(request) {
  const { league, roster, username } = await request.json();
  if (!league || !roster || !username) {
    return NextResponse.json({ error: 'league, roster, and username are required' }, { status: 400 });
  }

  const to = await getEmailForUsername(username);
  if (!to) {
    return NextResponse.json({ error: "Couldn't find an email address for this account yet." }, { status: 400 });
  }

  const { subject, text } = formatDigestEmail([{ league, roster }], 'all', `AutoManager: ${league.name} recommendations`);

  try {
    await sendEmail({ to, subject, text });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
