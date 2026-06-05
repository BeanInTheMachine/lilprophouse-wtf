import { NextResponse } from 'next/server';
import { getHouseById } from '@/lib/services/houseService';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });

    const house = await getHouseById(id);
    if (!house) return NextResponse.json({ error: 'House not found' }, { status: 404 });

    return NextResponse.json(house);
  } catch (error) {
    console.error('GET /api/houses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch house' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid house ID' }, { status: 400 });

    const body = await request.json();
    const house = await prisma.house.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.profileImageUrl !== undefined && { profileImageUrl: body.profileImageUrl }),
        ...(body.visible !== undefined && { visible: body.visible }),
      },
    });

    return NextResponse.json(house);
  } catch (error) {
    console.error('PATCH /api/houses/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update house' }, { status: 500 });
  }
}
