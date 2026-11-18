import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  LineBasicMaterial,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { hashString, mulberry32 } from '@/lib/prng';

export const AMBER_HEX = 0xffb547;

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')];
}

/** Seeded lathe marks: concentric rings with mulberry32 jitter, used as a roughness map. */
function latheRoughness(size: number): CanvasTexture {
  const [c, g] = canvas(size);
  if (g) {
    const rnd = mulberry32(hashString('reel-flange-lathe'));
    const mid = size / 2;
    // Base roughness ≈ 0.38 (the material multiplies roughness by the green channel).
    g.fillStyle = 'rgb(200, 200, 200)';
    g.fillRect(0, 0, size, size);
    for (let r = 2; r < mid; r += 0.6 + rnd() * 1.8) {
      const v = Math.round(150 + rnd() * 105);
      g.strokeStyle = `rgba(${v}, ${v}, ${v}, ${0.35 + rnd() * 0.5})`;
      g.lineWidth = 0.5 + rnd() * 1.2;
      g.beginPath();
      g.arc(mid, mid, r, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  // ExtrudeGeometry cap UVs are object-space x/y in [−1, 1]: remap to [0, 1].
  t.repeat.set(0.5, 0.5);
  t.offset.set(0.5, 0.5);
  t.anisotropy = 4;
  return t;
}

/** Fine wound rings for the film pack's faces. */
function woundRings(size: number): CanvasTexture {
  const [c, g] = canvas(size);
  if (g) {
    const rnd = mulberry32(hashString('reel-film-pack'));
    const mid = size / 2;
    g.fillStyle = '#17120d';
    g.fillRect(0, 0, size, size);
    for (let r = mid * 0.2; r < mid; r += 0.7 + rnd() * 0.9) {
      const l = Math.round(14 + rnd() * 22);
      g.strokeStyle = `rgb(${l + 8}, ${l + 3}, ${l - 2})`;
      g.lineWidth = 0.6;
      g.beginPath();
      g.arc(mid, mid, r, 0, Math.PI * 2);
      g.stroke();
    }
    // A slightly lighter leader band near the rim, where the film leaves the pack.
    g.strokeStyle = 'rgba(80, 60, 38, 0.6)';
    g.lineWidth = size * 0.012;
    g.beginPath();
    g.arc(mid, mid, mid * 0.97, 0, Math.PI * 2);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Radial amber glow for the halo card. */
function haloGradient(size: number): CanvasTexture {
  const [c, g] = canvas(size);
  if (g) {
    const mid = size / 2;
    const grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
    grad.addColorStop(0, 'rgba(255, 181, 71, 0.9)');
    grad.addColorStop(0.35, 'rgba(255, 160, 60, 0.35)');
    grad.addColorStop(0.7, 'rgba(255, 140, 50, 0.08)');
    grad.addColorStop(1, 'rgba(255, 140, 50, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export interface ReelMaterials {
  flange: MeshStandardMaterial;
  pack: MeshPhysicalMaterial;
  hub: MeshStandardMaterial;
  tally: MeshBasicMaterial;
  film: MeshStandardMaterial;
  halo: MeshBasicMaterial;
  /** The sweep's edge-line material (shared by all edge objects). */
  edge: LineBasicMaterial;
  /** Every material and texture, for disposal. */
  all: Array<Material | Texture>;
}

export function createReelMaterials(coarse: boolean, filmTexture: Texture): ReelMaterials {
  const roughnessMap = latheRoughness(coarse ? 256 : 512);
  const packMap = woundRings(coarse ? 256 : 512);
  const haloMap = haloGradient(256);

  const flange = new MeshStandardMaterial({
    color: 0x3a3b41, metalness: 1, roughness: 0.38 / 0.78, roughnessMap, envMapIntensity: 1.35,
  });
  const pack = new MeshPhysicalMaterial({
    color: 0xffffff, map: packMap, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, metalness: 0,
  });
  const hub = new MeshStandardMaterial({ color: 0xd9dadd, metalness: 1, roughness: 0.16, envMapIntensity: 1.2 });
  const tally = new MeshBasicMaterial({ color: AMBER_HEX, toneMapped: false, transparent: true, opacity: 1 });
  const film = new MeshStandardMaterial({
    map: filmTexture,
    emissiveMap: filmTexture,
    emissive: new Color(AMBER_HEX),
    emissiveIntensity: 0.35,
    alphaTest: 0.5,
    side: DoubleSide,
    metalness: 0.1,
    roughness: 0.42,
  });
  const halo = new MeshBasicMaterial({
    map: haloMap, blending: AdditiveBlending, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false,
  });
  const edge = new LineBasicMaterial({ color: 0xf3efe7, transparent: true, opacity: 0.55 });

  return {
    flange, pack, hub, tally, film, halo, edge,
    all: [flange, pack, hub, tally, film, halo, edge, roughnessMap, packMap, haloMap],
  };
}
