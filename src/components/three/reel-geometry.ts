import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  MathUtils,
  Path,
  PlaneGeometry,
  Shape,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { REEL } from '@/lib/reel-art';
import { FILM_FRAME_ASPECT, FILM_FRAMES } from './reel-film-texture';

const DEG = Math.PI / 180;

/** Two flanges (front and back) with six annular-sector windows and a bore, merged into one mesh. */
export function createFlangeGeometry(coarse: boolean): BufferGeometry {
  const { windows, flange, bore, radius } = REEL;
  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);

  for (let k = 0; k < windows.count; k++) {
    const c = (windows.firstCenterDeg + k * (360 / windows.count)) * DEG;
    const half = (windows.spanDeg / 2) * DEG;
    const hole = new Path();
    hole.absarc(0, 0, windows.outer, c - half, c + half, false);
    hole.absarc(0, 0, windows.inner, c + half, c - half, true);
    hole.closePath();
    shape.holes.push(hole);
  }
  const boreHole = new Path();
  boreHole.absarc(0, 0, bore, 0, Math.PI * 2, true);
  shape.holes.push(boreHole);

  const one = new ExtrudeGeometry(shape, {
    depth: flange.depth,
    bevelEnabled: true,
    bevelThickness: flange.bevel,
    bevelSize: flange.bevel,
    bevelSegments: flange.bevelSegments,
    curveSegments: coarse ? 40 : 64,
  });
  // Extrusion spans z ∈ [−bevel, depth + bevel]. Front flange: inner face at +innerZ.
  const front = one.clone().translate(0, 0, flange.innerZ + flange.bevel);
  // Back flange: inner face at −innerZ.
  const back = one.clone().translate(0, 0, -flange.innerZ - flange.depth - flange.bevel);
  one.dispose();
  const merged = mergeGeometries([front, back], false);
  front.dispose();
  back.dispose();
  return merged;
}

/** The wound film pack between the flanges, axle on z. */
export function createPackGeometry(): BufferGeometry {
  const g = new CylinderGeometry(REEL.pack.radius, REEL.pack.radius, REEL.pack.depth, 96, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

/** A turned hub (9-point lathe profile) with a square keyway, axle on z. */
export function createHubGeometry(): BufferGeometry {
  const { inner, outer } = REEL.hub;
  const profile = [
    [inner, -0.19], [0.135, -0.19], [0.158, -0.168], [0.17, -0.15], [outer, -0.135],
    [outer, 0.135], [0.17, 0.15], [0.158, 0.168], [0.135, 0.19],
  ].map(([r, y]) => new Vector2(r, y));
  profile.push(new Vector2(inner, 0.19));
  const lathe = new LatheGeometry(profile, 48);
  lathe.rotateX(Math.PI / 2);
  const key = new BoxGeometry(0.06, 0.06, 0.38);
  key.translate(0, inner + 0.012, 0);
  const merged = mergeGeometries([lathe, key], false);
  lathe.dispose();
  key.dispose();
  return merged;
}

/** The amber tally ring, sitting just proud of the front hub boss. */
export function createTallyGeometry(): BufferGeometry {
  const g = new TorusGeometry(REEL.tally.radius, REEL.tally.tube, 12, 96);
  g.translate(0, 0, REEL.flange.innerZ + REEL.flange.depth + REEL.flange.bevel + 0.012);
  return g;
}

/** The halo card behind the reel (stands in for bloom). */
export function createHaloGeometry(): BufferGeometry {
  return new PlaneGeometry(4.6, 4.6);
}

export interface RibbonGeometry {
  geometry: BufferGeometry;
  /** Arc length of one atlas repeat (six frames), in reel units. */
  atlasLength: number;
}

/**
 * The film ribbon leaving the pack (S1.6). A hand-built strip along a centripetal Catmull–Rom curve,
 * with the width vector easing from edge-on (along the axle) to face-on (toward the camera).
 * u runs along the film in atlas repeats; v runs across the film.
 */
export function createRibbonGeometry(coarse: boolean): RibbonGeometry {
  const { points, width, twistUntil } = REEL.ribbon;
  const curve = new CatmullRomCurve3(points.map((p) => new Vector3(p[0], p[1], p[2])), false, 'centripetal');
  const segments = coarse ? 140 : 220;
  const length = curve.getLength();
  const atlasLength = width * FILM_FRAME_ASPECT * FILM_FRAMES;

  const verts = segments + 1;
  const pos = new Float32Array(verts * 2 * 3);
  const nor = new Float32Array(verts * 2 * 3);
  const uv = new Float32Array(verts * 2 * 2);
  const index: number[] = [];

  const view = new Vector3(0, 0, 1);
  const zAxis = new Vector3(0, 0, 1);
  const zPerp = new Vector3();
  const sPerp = new Vector3();
  const w = new Vector3();
  const n = new Vector3();
  const p = new Vector3();
  const t = new Vector3();
  let prevW: Vector3 | null = null;

  for (let i = 0; i < verts; i++) {
    const u = i / segments; // arc fraction (getPointAt is arc-length parameterised)
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    // Z⊥: the axle direction made perpendicular to the tangent.
    zPerp.copy(zAxis).addScaledVector(t, -zAxis.dot(t));
    if (zPerp.lengthSq() < 1e-8) zPerp.set(1, 0, 0);
    zPerp.normalize();
    // S⊥: across the screen, so the film shows its face to the camera.
    sPerp.crossVectors(view, t);
    if (sPerp.lengthSq() < 1e-8) sPerp.copy(zPerp);
    sPerp.normalize();
    if (sPerp.dot(zPerp) < 0) sPerp.negate();
    const s = MathUtils.smoothstep(u, 0, twistUntil);
    w.copy(zPerp).lerp(sPerp, s);
    if (w.lengthSq() < 1e-8) w.copy(sPerp);
    w.normalize();
    // Keep the strip from flipping between samples.
    if (prevW && w.dot(prevW) < 0) w.negate();
    prevW = (prevW ?? new Vector3()).copy(w);
    n.crossVectors(t, w).normalize();

    for (let side = 0; side < 2; side++) {
      const k = i * 2 + side;
      const off = (side === 0 ? -0.5 : 0.5) * width;
      pos[k * 3] = p.x + w.x * off;
      pos[k * 3 + 1] = p.y + w.y * off;
      pos[k * 3 + 2] = p.z + w.z * off;
      nor[k * 3] = n.x;
      nor[k * 3 + 1] = n.y;
      nor[k * 3 + 2] = n.z;
      uv[k * 2] = (u * length) / atlasLength;
      uv[k * 2 + 1] = side;
    }
    if (i < segments) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      index.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new BufferAttribute(nor, 3));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return { geometry, atlasLength };
}
