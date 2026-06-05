import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    const address = formData.get('address') as string | null;

    if (!file || !name || !address) {
      return NextResponse.json({ error: 'file, name, and address are required' }, { status: 400 });
    }

    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'IPFS not configured — set PINATA_JWT environment variable' },
        { status: 501 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const pinataForm = new FormData();
    pinataForm.append('file', new Blob([buffer]), name);

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: pinataForm,
    });

    if (!pinataRes.ok) {
      const err = await pinataRes.json().catch(() => ({}));
      console.error('Pinata upload failed:', err);
      return NextResponse.json({ error: 'IPFS upload failed' }, { status: 502 });
    }

    const pinataResult = await pinataRes.json();
    const ipfsHash = pinataResult.IpfsHash;

    const storedFile = await prisma.file.create({
      data: {
        address: address.toLowerCase(),
        name,
        mimeType: file.type || 'application/octet-stream',
        ipfsHash,
        pinSize: String(pinataResult.PinSize || 0),
        ipfsTimestamp: pinataResult.Timestamp ? new Date(pinataResult.Timestamp).toISOString() : new Date().toISOString(),
      },
    });

    return NextResponse.json(storedFile, { status: 201 });
  } catch (error) {
    console.error('POST /api/files error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
