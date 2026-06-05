import { NextResponse } from 'next/server';
import { getCompletedRounds } from '@/lib/services/roundService';

export async function GET() {
  try {
    const rounds = await getCompletedRounds();
    return NextResponse.json(rounds);
  } catch (error) {
    console.error('GET /api/rounds/completed error:', error);
    return NextResponse.json({ error: 'Failed to fetch completed rounds' }, { status: 500 });
  }
}
