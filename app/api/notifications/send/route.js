import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/ses';
import { formatDigestEmail } from '@/lib/emailFormat';

export async function POST(request) {
  const { league, roster } = await request.json();
  if (!league || !roster) {
    return NextResponse.json({ error: 'league and roster are required' }, { status: 400 });
  }

  const { subject, text } = formatDigestEmail([{ league, roster }], 'all', `AutoManager: ${league.name} recommendations`);

  try {
    await sendEmail({ subject, text });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true });
}
