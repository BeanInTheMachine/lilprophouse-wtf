import { NextResponse } from 'next/server';
import { getHouses } from '@/lib/services/houseService';
import { prisma } from '@/lib/prisma';
import { validateRequired, isValidEthereumAddress } from '@/lib/validations';

export async function GET() {
  try {
    const houses = await getHouses();
    return NextResponse.json(houses);
  } catch (error) {
    console.error('GET /api/houses error:', error);
    return NextResponse.json({ error: 'Failed to fetch houses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const missing = validateRequired(body, ['contractAddress', 'name', 'profileImageUrl']);
    if (missing) return NextResponse.json({ error: missing }, { status: 400 });

    if (!isValidEthereumAddress(body.contractAddress)) {
      return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 });
    }

    const house = await prisma.house.create({
      data: {
        contractAddress: body.contractAddress.toLowerCase(),
        name: body.name,
        profileImageUrl: body.profileImageUrl,
        description: body.description ?? null,
      },
    });

    return NextResponse.json(house, { status: 201 });
  } catch (error) {
    console.error('POST /api/houses error:', error);
    return NextResponse.json({ error: 'Failed to create house' }, { status: 500 });
  }
}
