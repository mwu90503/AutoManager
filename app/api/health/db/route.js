import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { error } = await supabase.from('_supabase_migrations').select('*').limit(1);
  if (error && error.code !== 'PGRST205') {
    return NextResponse.json({ connected: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ connected: true });
}
