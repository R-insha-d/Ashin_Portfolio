import { ImageResponse } from 'next/og';
import { profile } from '@/content/profile';
import { formatTimecode } from '@/lib/timecode';
import { ReelLineArt } from '@/components/ui/reel-line-art';

export const alt = profile.copy.meta.ogAlt;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Latin text plus "·" and "&" only, so next/og never fetches a fallback font. No `fonts` option:
// the bundled Geist Regular is read from disk.
const VOID = '#0B0B0C';
const AMBER = '#FFB547';
const MARK = '#3A3A40';
const ML = 24; // crop mark length
const MT = 2; // crop mark thickness
const MI = 40; // crop mark inset

const marks = [
  { top: MI, left: MI, borderTop: `${MT}px solid ${MARK}`, borderLeft: `${MT}px solid ${MARK}` },
  { top: MI, right: MI, borderTop: `${MT}px solid ${MARK}`, borderRight: `${MT}px solid ${MARK}` },
  { bottom: MI, right: MI, borderBottom: `${MT}px solid ${MARK}`, borderRight: `${MT}px solid ${MARK}` },
  { bottom: MI, left: MI, borderBottom: `${MT}px solid ${MARK}`, borderLeft: `${MT}px solid ${MARK}` },
] as const;

/** Diagonal amber/void clapper stripes along the bottom edge. */
function clapperPolygons(width: number, h: number, stripe: number): string[] {
  const out: string[] = [];
  for (let x = -h; x < width + h; x += stripe * 2) {
    out.push(`${x},${h} ${x + h},0 ${x + h + stripe},0 ${x + stripe},${h}`);
  }
  return out;
}

export default function OpengraphImage() {
  const { copy } = profile;
  // "Reel · 25p" → "25p"; keeps every visible string sourced from profile.ts.
  const rate = copy.monitor.reelClock.split(' · ').pop() ?? '';
  const recLine = [copy.sequence.name, rate, formatTimecode(0)].join(' · ');
  const tools = profile.tools.map((t) => t.shortName).join(' · ');
  const W = size.width;
  const H = size.height;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: VOID }}>
        {marks.map((m, i) => (
          <div key={i} style={{ position: 'absolute', display: 'flex', width: ML, height: ML, ...m }} />
        ))}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            left: W * 0.1,
            top: H * 0.1,
            width: W * 0.8,
            height: H * 0.8,
            border: '1px solid #2A2A2F',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: '#FF453A' }} />
          <div style={{ display: 'flex', color: AMBER }}>{copy.motion.rec}</div>
          <div style={{ display: 'flex', color: '#8E8A82' }}>{recLine}</div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 0,
            bottom: 0,
            width: 600,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 20,
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex', fontSize: 112, lineHeight: 1, letterSpacing: 6, color: '#F3EFE7' }}>
            {profile.name}
          </div>
          <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, color: AMBER }}>{profile.role}</div>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, color: '#BDB8AE' }}>
            {profile.location.display}
          </div>
        </div>

        <div style={{ position: 'absolute', display: 'flex', left: 1128 - 400, top: (H - 300) / 2 }}>
          <ReelLineArt width={400} height={300} stroke="#F3EFE7" strokeOpacity={0.55} accent={AMBER} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 548,
            display: 'flex',
            fontSize: 18,
            letterSpacing: 3,
            color: '#8E8A82',
            textTransform: 'uppercase',
          }}
        >
          {tools}
        </div>

        <svg
          width={W}
          height={8}
          viewBox={`0 0 ${W} 8`}
          style={{ position: 'absolute', left: 0, bottom: 0 }}
        >
          <rect x={0} y={0} width={W} height={8} fill={VOID} />
          {clapperPolygons(W, 8, 16).map((points, i) => (
            <polygon key={i} points={points} fill={AMBER} />
          ))}
        </svg>
      </div>
    ),
    { ...size },
  );
}
