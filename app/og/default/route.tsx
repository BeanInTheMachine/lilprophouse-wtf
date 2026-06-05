import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
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
          background:
            'linear-gradient(135deg, #e02ecf 0%, #8a2be2 50%, #cba727 100%)',
          fontFamily: 'system-ui',
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: 'white',
            marginBottom: 20,
          }}
        >
          Prop House
        </h1>
        <p
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.85)',
            marginBottom: 40,
          }}
        >
          A simple and fun way to award builders.
        </p>
        <div
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Born in and funded by Nouns DAO
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
