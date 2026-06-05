import { NextResponse } from 'next/server';
import { getHouseByContractAddress } from '@/lib/services/houseService';

export async function GET(
  _request: Request,
  { params }: { params: { address: string } },
) {
  try {
    const house = await getHouseByContractAddress(params.address);

    if (!house) {
      return NextResponse.json({ error: 'House not found' }, { status: 404 });
    }

    return NextResponse.json(house);
  } catch (error) {
    console.error('GET /api/houses/contract/[address] error:', error);
    return NextResponse.json({ error: 'Failed to fetch house' }, { status: 500 });
  }
}
