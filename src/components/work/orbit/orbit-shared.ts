import type { GalleryProject } from '../project-card';

/** Short UI strings new to the ORBIT concept (not in portfolio.json yet). */
export const OB_LABELS = {
  stage: 'Projects reel, 3D view',
  onAir: 'On air',
  cam: 'Cam A',
  muted: 'Preview · muted',
  drag: 'Drag',
  play: 'Play',
  hint: 'Drag · ← → · Click, then scroll',
  upNext: 'Up next',
  continue: 'Scroll to continue',
  jumped: 'Jumped to',
  of: 'of',
  hintTouch: 'Swipe to spin',
  index: 'Reel index',
  jump: 'Jump to category',
  roll: 'Roll',
  scrollBack: 'Scroll the roll back',
  scrollOn: 'Scroll the roll on',
} as const;

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function aspectOf(p: GalleryProject): number {
  return p.video ? p.video.width / p.video.height : 4 / 5;
}

export function posterOf(p: GalleryProject): string | null {
  if (!p.posterOk) return null;
  return p.video ? p.video.poster : p.image?.src ?? null;
}

function seconds(d: string | null | undefined): number {
  if (!d) return 0;
  return d.split(':').reduce((t, part) => t * 60 + (Number(part) || 0), 0);
}

export function runtimeOf(list: readonly GalleryProject[]): string {
  const total = list.reduce((t, p) => t + seconds(p.video?.duration), 0);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

/** Accessible name: number, title (never shown on screen), category, duration and the action. */
export function projectLabel(p: GalleryProject, i: number, n: number, action: string): string {
  const parts = [`${pad2(i + 1)} / ${pad2(n)}`, p.title, p.category];
  if (p.video?.duration) parts.push(p.video.duration);
  return `${parts.join(', ')}. ${action}`;
}

/* ------------------------------------------------------------------ stage layout (shared, no three)
 * World units: an on-air reel is 1 tall. Off-air screens are smaller and wide films are cropped to a
 * near-square window so neighbours peek instead of competing with the hero; a screen grows to its
 * on-air size (and full aspect) as it comes on air. orbit-stage.ts lays the ring out from these, and
 * the HUD's loading placeholder can use the same numbers to match the first WebGL frame.
 */
export const OB_LAYOUT = {
  /** Gap between neighbouring screens along the ring. */
  gap: 0.2,
  /** Off-air size relative to on-air. */
  offScale: 0.8,
  /** Off-air width cap, in off-air reel widths (a wide film is at most this wide when not on air). */
  offWideCap: 1.35,
  /** Off-air films are cropped to at most this aspect (width / height). */
  offMaxAspect: 1.3,
  /** Wide on-air screens are at most this wide. */
  onMaxWidth: 1.38,
  /** Off-air screens sit this much further back (world units), so they read smaller with distance. */
  offPush: 0.5,
  /** Rings of 1 to 3 projects are a flat arc of this radius (no repeats). */
  flatRadius: 7.5,
  /** Vertical / horizontal share of the viewport the on-air screen fills (phones, wider screens). */
  fitPhone: { h: 0.5, w: 0.76 },
  fitWide: { h: 0.65, w: 0.74 },
} as const;

export type ObDims = { w: number; h: number };

/** On-air and off-air screen sizes for a media aspect (width / height). */
export function screenDims(aspect: number): { on: ObDims; off: ObDims } {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 9 / 16;
  const onH = a > 1 ? Math.min(1, OB_LAYOUT.onMaxWidth / a) : 1;
  const on = { w: onH * a, h: onH };
  const cap = (9 / 16) * OB_LAYOUT.offScale * OB_LAYOUT.offWideCap;
  const offW = Math.min(on.w * OB_LAYOUT.offScale, cap);
  const offH = Math.min(on.h * OB_LAYOUT.offScale, offW / Math.min(a, OB_LAYOUT.offMaxAspect));
  return { on, off: { w: offW, h: offH } };
}

/** A sized poster through the Next image optimiser (texture-friendly, small on phones). */
export function texturePoster(src: string, width: number): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
