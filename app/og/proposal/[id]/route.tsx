import { ImageResponse } from 'next/og';
import { getProposalById } from '@/lib/services/proposalService';

export const runtime = 'edge';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const proposalId = parseInt(idStr, 10);
  const proposal = !isNaN(proposalId) ? await getProposalById(proposalId) : null;

  const totalVotes = (proposal?.voteCountFor ?? 0) + (proposal?.voteCountAgainst ?? 0);
  const forPercent = totalVotes > 0 ? ((proposal?.voteCountFor ?? 0) / totalVotes) * 100 : 0;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: 1200,
          height: 630,
          background:
            'linear-gradient(135deg, #e02ecf 0%, #8a2be2 50%, #cba727 100%)',
          fontFamily: 'system-ui',
          padding: 60,
        }}
      >
        <h1
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: 'white',
            marginBottom: 20,
            maxWidth: 900,
            lineHeight: 1.2,
          }}
        >
          {proposal?.title ?? 'Proposal'}
        </h1>
        <p
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.85)',
            maxWidth: 800,
            lineHeight: 1.4,
            marginBottom: 40,
          }}
        >
          {proposal?.tldr ?? ''}
        </p>
        <div style={{ display: 'flex', gap: 16, fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>
          <span>
            by {proposal?.address?.slice(0, 6)}...{proposal?.address?.slice(-4)}
          </span>
        </div>
        {totalVotes > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 40,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {proposal?.voteCountFor} for · {proposal?.voteCountAgainst} against ·{' '}
              {Math.round(forPercent)}%
            </div>
          </div>
        )}
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
