import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAllPlayers } from '@/lib/sleeperClient';

const BATCH_SIZE = 500;

// Vercel Cron issues GET requests and sends `Authorization: Bearer $CRON_SECRET` automatically.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const players = await getAllPlayers();
  const rows = Object.values(players)
    .filter((p) => p.player_id && p.position)
    .map((p) => ({
      player_id: p.player_id,
      full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      position: p.position,
      team: p.team,
      injury_status: p.injury_status || null,
      practice_participation: p.practice_participation || null,
      years_exp: p.years_exp ?? null,
      updated_at: new Date().toISOString(),
    }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('sleeper_players').upsert(batch, { onConflict: 'player_id' });
    if (error) {
      return NextResponse.json({ error: error.message, upserted: i }, { status: 500 });
    }
  }

  return NextResponse.json({ count: rows.length });
}
