import { NextResponse } from 'next/server';
import { getActiveLeagueAnalyses } from '@/lib/rosterRecommendations';

export async function GET() {
  try {
    const results = await getActiveLeagueAnalyses();
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
