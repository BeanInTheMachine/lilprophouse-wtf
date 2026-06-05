import { ImageResponse } from 'next/og';
import { getRoundById } from '@/lib/services/roundService';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const roundId = parseInt(idStr, 10);
  const round = !isNaN(roundId) ? await getRoundById(roundId) : null;

  const statusColor =
    round?.state === 'ACCEPTING_PROPOSALS'
      ? '#50ba9a'
      : round?.state === 'VOTING'
        ? '#8a2be2'
        : round?.state === 'COMPLETED'
          ? '#666666'
          : round?.state === 'CANCELLED'
            ? '#e02e2e'
            : '#666666';

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
          background: 'linear-gradient(135deg, #14161b 0%, #2d1f3d 100%)',
          fontFamily: 'system-ui',
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'flex',
            padding: '8px 20px',
            borderRadius: 12,
            backgroundColor: `${statusColor}22`,
            color: statusColor,
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          {round?.state?.replace(/_/g, ' ') ?? 'Round'}
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
          {round?.title ?? 'Funding Round'}
        </h1>
        {round?.description && (
          <p
            style={{
              fontSize: 22,
              color: 'rgba(255,255,255,0.7)',
              textAlign: 'center',
              maxWidth: 700,
            }}
          >
            {round.description}
          </p>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginTop: 40,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#8a2be2' }}>
              {round?.fundingAmount ? Number(round.fundingAmount) : '—'}{' '}
              {round?.currencyType ?? ''}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Funding</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#e02ecf' }}>
              {round?.numWinners ?? '—'}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Winners</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 36, fontWeight: 700, color: '#cba727' }}>
              {round?.proposals?.length ?? 0}
            </span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>Proposals</span>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 18,
            color: 'rgba(255,255,255,0.4)',
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
