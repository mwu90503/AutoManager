import { NextResponse } from 'next/server';
import { getPlayerOsint } from '@/lib/playerOsint';

export async function POST(request) {
  const { name, team, position } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const result = await getPlayerOsint({ name, team, position });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
