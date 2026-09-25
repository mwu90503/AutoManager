import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
  const { username, email } = await request.json();
  if (!username || !email) {
    return NextResponse.json({ error: 'username and email are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('app_users')
    .upsert({ username, email, updated_at: new Date().toISOString() }, { onConflict: 'username' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
