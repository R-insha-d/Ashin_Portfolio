import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const AMBER = '#FFB547';
const T = 7; // bracket thickness
const L = 40; // bracket length
const I = 30; // inset

const corners = [
  { top: I, left: I, borderTop: `${T}px solid ${AMBER}`, borderLeft: `${T}px solid ${AMBER}` },
  { top: I, right: I, borderTop: `${T}px solid ${AMBER}`, borderRight: `${T}px solid ${AMBER}` },
  { bottom: I, right: I, borderBottom: `${T}px solid ${AMBER}`, borderRight: `${T}px solid ${AMBER}` },
  { bottom: I, left: I, borderBottom: `${T}px solid ${AMBER}`, borderLeft: `${T}px solid ${AMBER}` },
] as const;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: '#0B0B0C',
        }}
      >
        {corners.map((c, i) => (
          <div key={i} style={{ position: 'absolute', display: 'flex', width: L, height: L, ...c }} />
        ))}
        <div style={{ display: 'flex', width: 40, height: 40, borderRadius: 20, background: '#FF453A' }} />
      </div>
    ),
    { ...size },
  );
}
