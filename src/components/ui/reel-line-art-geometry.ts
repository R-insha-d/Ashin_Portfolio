// NOTE(integrator): spec A7 says src/lib/reel-art.ts exports annularSectorPath, windowPaths,
// ribbonSamples and ribbonPosterPaths, but the foundation file stops at projectedRadius.
// They are implemented here privately; move them into reel-art.ts if S1 needs them too.
import { ART, FRONT_Z, REEL, projectStartPose, projectedRadius, type Vec3 } from '@/lib/reel-art';

const CX = ART.width / 2;
const CY = ART.height / 2;
const f = (n: number) => Math.round(n * 100) / 100;

function polar(r: number, deg: number, z: number): readonly [number, number] {
  const a = (deg * Math.PI) / 180;
  return projectStartPose([r * Math.cos(a), r * Math.sin(a), z]);
}

/** SVG `d` for an annular sector in ART space. Angles are counter-clockwise from +x in reel space. */
export function annularSectorPath(r0: number, r1: number, startDeg: number, endDeg: number, z: number = FRONT_Z): string {
  const R1 = projectedRadius(r1, z);
  const R0 = projectedRadius(r0, z);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const [ox0, oy0] = polar(r1, startDeg, z);
  const [ox1, oy1] = polar(r1, endDeg, z);
  const [ix1, iy1] = polar(r0, endDeg, z);
  const [ix0, iy0] = polar(r0, startDeg, z);
  // y is flipped for SVG, so counter-clockwise in reel space is sweep-flag 0 on screen.
  return [
    `M${f(ox0)} ${f(oy0)}`,
    `A${f(R1)} ${f(R1)} 0 ${large} 0 ${f(ox1)} ${f(oy1)}`,
    `L${f(ix1)} ${f(iy1)}`,
    `A${f(R0)} ${f(R0)} 0 ${large} 1 ${f(ix0)} ${f(iy0)}`,
    'Z',
  ].join(' ');
}

/** The six spoke windows, centred at firstCenterDeg + k × 60°, each spanning ±spanDeg/2. */
export function windowPaths(): string[] {
  const { count, inner, outer, spanDeg, firstCenterDeg } = REEL.windows;
  const step = 360 / count;
  return Array.from({ length: count }, (_, k) => {
    const c = firstCenterDeg + k * step;
    return annularSectorPath(inner, outer, c - spanDeg / 2, c + spanDeg / 2);
  });
}

type V = [number, number, number];
const sub = (a: Vec3, b: Vec3): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const distSq = (a: Vec3, b: Vec3) => {
  const d = sub(a, b);
  return d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
};

/** Non-uniform Catmull-Rom coefficients (port of three's CubicPoly.initNonuniformCatmullRom). */
function cubic(x0: number, x1: number, x2: number, x3: number, dt0: number, dt1: number, dt2: number) {
  let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
  let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
  t1 *= dt1;
  t2 *= dt1;
  const c0 = x1;
  const c1 = t1;
  const c2 = -3 * x1 + 3 * x2 - 2 * t1 - t2;
  const c3 = 2 * x1 - 2 * x2 + t1 + t2;
  return (t: number) => c0 + c1 * t + c2 * t * t + c3 * t * t * t;
}

/** Centripetal Catmull-Rom (α = 0.5) through REEL.ribbon.points, open, with phantom end points. */
export function ribbonSamples(perSpan = 12): Vec3[] {
  const pts = REEL.ribbon.points as readonly Vec3[];
  const n = pts.length;
  const first = pts[0];
  const last = pts[n - 1];
  const head: Vec3 = [2 * first[0] - pts[1][0], 2 * first[1] - pts[1][1], 2 * first[2] - pts[1][2]];
  const tail: Vec3 = [2 * last[0] - pts[n - 2][0], 2 * last[1] - pts[n - 2][1], 2 * last[2] - pts[n - 2][2]];
  const all: Vec3[] = [head, ...pts, tail];
  const out: Vec3[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = all[i];
    const p1 = all[i + 1];
    const p2 = all[i + 2];
    const p3 = all[i + 3];
    let dt0 = Math.pow(distSq(p0, p1), 0.25);
    let dt1 = Math.pow(distSq(p1, p2), 0.25);
    let dt2 = Math.pow(distSq(p2, p3), 0.25);
    if (dt1 < 1e-4) dt1 = 1.0;
    if (dt0 < 1e-4) dt0 = dt1;
    if (dt2 < 1e-4) dt2 = dt1;
    const px = cubic(p0[0], p1[0], p2[0], p3[0], dt0, dt1, dt2);
    const py = cubic(p0[1], p1[1], p2[1], p3[1], dt0, dt1, dt2);
    const pz = cubic(p0[2], p1[2], p2[2], p3[2], dt0, dt1, dt2);
    for (let s = 0; s < perSpan; s++) {
      const t = s / perSpan;
      out.push([px(t), py(t), pz(t)]);
    }
  }
  out.push(last);
  return out;
}

export type Perforation = { x: number; y: number; w: number; h: number; rotate: number };
export type RibbonPoster = {
  center: string;
  left: string;
  right: string;
  frameLines: string[];
  perforations: Perforation[];
};

type P2 = { x: number; y: number; nx: number; ny: number; half: number; s: number };

function polyline(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`).join(' ');
}

/** Film ribbon line art in ART space: edge-on centre line, then face-on edges, frame lines and perforations. */
export function ribbonPosterPaths(): RibbonPoster {
  const samples = ribbonSamples(16);
  // 3D arc length, to find where the twist ends.
  const cum: number[] = [0];
  for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.sqrt(distSq(samples[i], samples[i - 1])));
  const total = cum[cum.length - 1];
  const twistAt = total * REEL.ribbon.twistUntil;
  const twistIdx = Math.max(1, cum.findIndex((c) => c >= twistAt));

  const proj = samples.map((p) => projectStartPose(p));
  const center = polyline(proj.slice(0, twistIdx + 1));

  // Face-on part: offset the projected centre line by ± projected half width along the 2D normal.
  const face: P2[] = [];
  let s2 = 0;
  for (let i = twistIdx; i < samples.length; i++) {
    const prev = proj[Math.max(i - 1, 0)];
    const next = proj[Math.min(i + 1, proj.length - 1)];
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    if (i > twistIdx) s2 += Math.hypot(proj[i][0] - proj[i - 1][0], proj[i][1] - proj[i - 1][1]);
    face.push({
      x: proj[i][0],
      y: proj[i][1],
      nx: -ty,
      ny: tx,
      half: projectedRadius(REEL.ribbon.width, samples[i][2]) / 2,
      s: s2,
    });
  }
  const faceLen = s2;
  const leftPts = face.map((p) => [p.x + p.nx * p.half, p.y + p.ny * p.half] as const);
  const rightPts = face.map((p) => [p.x - p.nx * p.half, p.y - p.ny * p.half] as const);

  const at = (s: number): P2 => {
    let j = 1;
    while (j < face.length - 1 && face[j].s < s) j++;
    const a = face[j - 1];
    const b = face[j];
    const span = b.s - a.s || 1;
    const t = Math.min(1, Math.max(0, (s - a.s) / span));
    const lerp = (u: number, v: number) => u + (v - u) * t;
    const nx = lerp(a.nx, b.nx);
    const ny = lerp(a.ny, b.ny);
    const nl = Math.hypot(nx, ny) || 1;
    return { x: lerp(a.x, b.x), y: lerp(a.y, b.y), nx: nx / nl, ny: ny / nl, half: lerp(a.half, b.half), s };
  };

  const frameLines: string[] = [];
  for (let k = 1; k < 8; k++) {
    const p = at((faceLen * k) / 8);
    const inset = p.half * 0.72;
    frameLines.push(
      polyline([
        [p.x + p.nx * inset, p.y + p.ny * inset],
        [p.x - p.nx * inset, p.y - p.ny * inset],
      ]),
    );
  }

  const perforations: Perforation[] = [];
  for (let s = 3; s < faceLen - 1; s += 6) {
    const p = at(s);
    const rotate = f((Math.atan2(-p.nx, p.ny) * 180) / Math.PI);
    for (const side of [1, -1]) {
      const off = p.half * 0.86 * side;
      const cx = p.x + p.nx * off;
      const cy = p.y + p.ny * off;
      perforations.push({ x: f(cx - 1.5), y: f(cy - 1), w: 3, h: 2, rotate });
    }
  }

  return { center, left: polyline(leftPts), right: polyline(rightPts), frameLines, perforations };
}

export const ART_CENTER = { x: CX, y: CY } as const;
