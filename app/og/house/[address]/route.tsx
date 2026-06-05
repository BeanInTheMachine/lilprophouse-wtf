import { ImageResponse } from 'next/og';
import { getHouseByContractAddress } from '@/lib/services/houseService';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const house = await getHouseByContractAddress(address);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: 1200,
          height: 630,
          background: 'linear-gradient(135deg, #8a2be2 0%, #e02ecf 100%)',
          fontFamily: 'system-ui',
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 108,
            height: 108,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          {house?.profileImageUrl ? (
            <img
              src={house.profileImageUrl}
              alt=""
              width={108}
              height={108}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {house?.name?.charAt(0) ?? 'H'}
            </span>
          )}
        </div>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            marginBottom: 16,
            maxWidth: 900,
          }}
        >
          {house?.name ?? 'House'}
        </h1>
        {house?.description && (
          <p
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              maxWidth: 700,
            }}
          >
            {house.description}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginTop: 40,
            fontSize: 20,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <span>{house?.rounds?.length ?? 0} rounds</span>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          prop.house
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
