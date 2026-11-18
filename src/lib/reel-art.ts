export type Vec3 = readonly [number, number, number];

/** All lengths in reel units (outer flange radius = 1). Start pose: front-on, axle on z. */
export const REEL = {
  radius: 1,
  flange: { depth: 0.03, innerZ: 0.115, bevel: 0.008, bevelSegments: 2 },
  windows: { count: 6, inner: 0.3, outer: 0.86, spanDeg: 42, firstCenterDeg: 90 },
  bore: 0.09,
  hub: { outer: 0.22, inner: 0.08 },
  pack: { radius: 0.8, depth: 0.22 },
  tally: { radius: 0.24, tube: 0.012 },
  ribbon: {
    width: 0.22,
    twistUntil: 0.35, // fraction of length over which the film turns from edge-on to face-on
    points: [
      [0.8, 0.2, 0], [0.8, -0.3, 0], [0.95, -0.75, 0.05], [1.35, -1.0, 0.18],
      [1.4, -1.3, 0.3], [0.95, -1.55, 0.45], [0.3, -2.1, 0.7],
    ] as const satisfies readonly Vec3[],
  },
  camera: { fov: 28, position: [0, 0, 6.4] as const, near: 0.1, far: 50 },
  restPose: { rotationX: -0.12, rotationY: -0.42 },
} as const;

/** SVG art space: 4:3, same as the hero monitor. */
export const ART = { width: 400, height: 300 } as const;
const FOCAL = ART.height / 2 / Math.tan((REEL.camera.fov * Math.PI) / 360);
export const FRONT_Z = REEL.flange.innerZ + REEL.flange.depth;

/** Pinhole projection of a start-pose point into ART space (camera on +z, looking at the origin). */
export function projectStartPose([x, y, z]: Vec3): readonly [number, number] {
  const depth = REEL.camera.position[2] - z;
  return [ART.width / 2 + (FOCAL * x) / depth, ART.height / 2 - (FOCAL * y) / depth];
}
export function projectedRadius(r: number, z: number = FRONT_Z): number {
  return (FOCAL * r) / (REEL.camera.position[2] - z);
}
