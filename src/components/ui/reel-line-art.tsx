import type * as React from 'react';
import { REEL, projectedRadius } from '@/lib/reel-art';
import { ART_CENTER, ribbonPosterPaths, windowPaths } from '@/components/ui/reel-line-art-geometry';

type ReelLineArtProps = {
  width?: number | string;
  height?: number | string;
  stroke?: string;
  accent?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  perforations?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

// Deterministic geometry, computed once per module.
const WINDOWS = windowPaths();
const RIBBON = ribbonPosterPaths();
const R = {
  flange: projectedRadius(REEL.radius),
  rim: projectedRadius(0.97),
  pack: projectedRadius(REEL.pack.radius),
  hub: projectedRadius(REEL.hub.outer),
  bore: projectedRadius(REEL.bore),
  key: projectedRadius(0.06),
  tally: projectedRadius(REEL.tally.radius),
};
const { x: cx, y: cy } = ART_CENTER;

/**
 * Wireframe of the procedural film reel in its exact start pose (hero poster, OG image).
 * SVG attributes and inline style only, never classes, so Satori renders it identically.
 */
export function ReelLineArt({
  width = '100%',
  height = '100%',
  stroke = '#F3EFE7',
  accent = '#FFB547',
  strokeOpacity = 0.55,
  strokeWidth = 1,
  perforations = true,
  className,
  style,
}: ReelLineArtProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 300"
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <g
        fill="none"
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <circle cx={cx} cy={cy} r={R.flange} />
        <circle cx={cx} cy={cy} r={R.rim} />
        {WINDOWS.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <circle cx={cx} cy={cy} r={R.pack} />
        <circle cx={cx} cy={cy} r={R.hub} />
        <circle cx={cx} cy={cy} r={R.bore} />
        <rect x={cx - R.key} y={cy - R.key} width={R.key * 2} height={R.key * 2} />
        <path d={RIBBON.center} />
        <path d={RIBBON.left} />
        <path d={RIBBON.right} />
        {RIBBON.frameLines.map((d, i) => (
          <path key={i} d={d} strokeOpacity={strokeOpacity * 0.7} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={R.tally} fill="none" stroke={accent} strokeWidth={strokeWidth} />
      {perforations && (
        <g fill={stroke} fillOpacity={strokeOpacity}>
          {RIBBON.perforations.map((p, i) => (
            <rect
              key={i}
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              transform={`rotate(${p.rotate} ${p.x + p.w / 2} ${p.y + p.h / 2})`}
            />
          ))}
        </g>
      )}
    </svg>
  );
}
