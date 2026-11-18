import {
  Color,
  DoubleSide,
  type Material,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  Scene,
  type WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';

/**
 * A procedural photo studio baked once into a PMREM (S1.5): no HDRI, no network, no drei Environment.
 * Emissive cards only; the studio scene and the generator are disposed straight after the bake.
 * Returns the PMREM render target; use `.texture` as `scene.environment` and dispose the target on unmount.
 */
export function bakeStudioEnvironment(renderer: WebGLRenderer, coarse: boolean): WebGLRenderTarget {
  const studio = new Scene();
  studio.background = new Color(0x050506);
  const disposables: Array<{ dispose(): void }> = [];

  const card = (
    geo: PlaneGeometry | RingGeometry,
    hex: number,
    intensity: number,
    place: (m: Mesh) => void,
  ) => {
    const mat: Material = new MeshBasicMaterial({
      color: new Color(hex).multiplyScalar(intensity),
      toneMapped: false,
      side: DoubleSide,
    });
    const mesh = new Mesh(geo, mat);
    place(mesh);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
    disposables.push(geo, mat);
  };

  // Top softbox: the long warm key that draws the flange highlights.
  card(new PlaneGeometry(6, 1.2), 0xfff4e6, 2, (m) => m.position.set(0, 5, 1.5));
  // Left strip: a crisp white edge light on the bevels and hub.
  card(new PlaneGeometry(0.25, 6), 0xffffff, 3, (m) => m.position.set(-5, 0.5, 2));
  // Right glow: cool fill so the metal never goes flat.
  card(new PlaneGeometry(3, 3), 0x9cc8ff, 0.7, (m) => m.position.set(5, -0.5, 1));
  // Rear amber rim: the accent picked up by every edge facing away from camera.
  card(new RingGeometry(1.6, 2, 64), 0xffb547, 4, (m) => m.position.set(0, 0.5, -5));
  // A faint floor bounce so undersides read as metal, not void.
  card(new PlaneGeometry(8, 8), 0x1a1612, 1, (m) => m.position.set(0, -6, 0));

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(studio, 0.04, 0.1, 100, { size: coarse ? 128 : 256 });
  pmrem.dispose();
  for (const d of disposables) d.dispose();
  return target;
}
