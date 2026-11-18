import { cn } from '@/lib/cn';
import { hashString, mulberry32 } from '@/lib/prng';

type WaveformProps = { seed: string; bars?: number; className?: string };

/** Deterministic decorative audio waveform (server-safe: seeded PRNG). */
export function Waveform({ seed, bars = 48, className }: WaveformProps) {
  const rnd = mulberry32(hashString(seed));
  const heights = Array.from({ length: bars }, () => 6 + 26 * rnd());
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${bars * 3} 32`}
      className={cn('block', className)}
    >
      {heights.map((h, i) => (
        <rect key={i} x={i * 3} y={(32 - h) / 2} width={2} height={h} fill="currentColor" />
      ))}
    </svg>
  );
}
