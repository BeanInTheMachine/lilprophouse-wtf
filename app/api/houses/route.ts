import { NextResponse } from 'next/server';
import { getHouses } from '@/lib/services/houseService';

export async function GET() {
  try {
    const houses = await getHouses();
    return NextResponse.json(houses);
  } catch (error) {
    console.error('GET /api/houses error:', error);
    return NextResponse.json({ error: 'Failed to fetch houses' }, { status: 500 });
  }
}
