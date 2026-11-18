import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/**
 * Film-strip atlas (S1.6): six frames laid along u, film width along v.
 * Each frame: base #120E0A, four perforations per side (alpha 0 → alphaTest cuts them),
 * amber edge print "AN · 25P · 000n" and a 1px line pictogram of one CV discipline.
 */
export const FILM_FRAMES = 6;
/** Frame length ÷ film width, from the atlas proportions (256 along × 512 across per frame). */
export const FILM_FRAME_ASPECT = 0.5;

const AMBER = '#ffb547';
const BASE = '#120e0a';
const LINE = 'rgba(243, 239, 231, 0.82)';

/** Read the next/font hashed family from the CSS variable; never hard-code the font name. */
function monoFamily(): string | null {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--font-jetbrains-mono');
    const first = raw.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
    return first ? first : null;
  } catch {
    return null;
  }
}

async function resolveFont(): Promise<string> {
  const fallback = 'ui-monospace, monospace';
  const family = monoFamily();
  if (!family || typeof document === 'undefined' || !document.fonts) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), 2000); });
  try {
    const result = await Promise.race([document.fonts.load(`500 32px "${family}"`), timeout]);
    if (result === 'timeout' || result.length === 0) return fallback;
    return `"${family}", ${fallback}`;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** One-line pictograms, drawn in a unit box (w × h) centred on the frame's image area. */
const PICTOGRAMS: readonly Draw[] = [
  // 1. Clips on a track (video editing).
  (g, w, h) => {
    const rows = [0.28, 0.5, 0.72];
    const clips = [[0.08, 0.42, 0.5, 0.88], [0.22, 0.62], [0.08, 0.3, 0.36, 0.7, 0.76, 0.92]];
    rows.forEach((y, r) => {
      const c = clips[r];
      for (let i = 0; i < c.length; i += 2) g.strokeRect(c[i] * w, (y - 0.07) * h, (c[i + 1] - c[i]) * w, 0.14 * h);
    });
    g.beginPath(); g.moveTo(0.56 * w, 0.12 * h); g.lineTo(0.56 * w, 0.88 * h); g.stroke();
  },
  // 2. A bezier with keyframes (motion graphics).
  (g, w, h) => {
    g.beginPath(); g.moveTo(0.1 * w, 0.8 * h); g.bezierCurveTo(0.45 * w, 0.85 * h, 0.4 * w, 0.18 * h, 0.9 * w, 0.2 * h); g.stroke();
    for (const [x, y] of [[0.1, 0.8], [0.5, 0.5], [0.9, 0.2]]) {
      g.save(); g.translate(x * w, y * h); g.rotate(Math.PI / 4); g.strokeRect(-6, -6, 12, 12); g.restore();
    }
  },
  // 3. A pen path with handles (design).
  (g, w, h) => {
    g.beginPath(); g.moveTo(0.12 * w, 0.75 * h); g.quadraticCurveTo(0.5 * w, 0.05 * h, 0.88 * w, 0.75 * h); g.stroke();
    g.beginPath(); g.moveTo(0.3 * w, 0.3 * h); g.lineTo(0.7 * w, 0.3 * h); g.stroke();
    for (const [x, y] of [[0.3, 0.3], [0.7, 0.3]]) { g.beginPath(); g.arc(x * w, y * h, 5, 0, Math.PI * 2); g.stroke(); }
    g.strokeRect(0.5 * w - 6, 0.4 * h - 6, 12, 12);
    for (const [x, y] of [[0.12, 0.75], [0.88, 0.75]]) g.strokeRect(x * w - 5, y * h - 5, 10, 10);
  },
  // 4. A wire cube (3D modelling).
  (g, w, h) => {
    const s = Math.min(w, h) * 0.42, ox = w * 0.44, oy = h * 0.56, d = s * 0.42;
    const front: Array<[number, number]> = [[ox - s / 2, oy - s / 2], [ox + s / 2, oy - s / 2], [ox + s / 2, oy + s / 2], [ox - s / 2, oy + s / 2]];
    const back = front.map(([x, y]) => [x + d, y - d] as [number, number]);
    const poly = (p: Array<[number, number]>) => { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); };
    poly(front); poly(back);
    g.beginPath(); front.forEach(([x, y], i) => { g.moveTo(x, y); g.lineTo(back[i][0], back[i][1]); }); g.stroke();
  },
  // 5. A bouncing-ball arc (animation).
  (g, w, h) => {
    g.setLineDash([3, 5]);
    g.beginPath(); g.moveTo(0.08 * w, 0.25 * h);
    g.quadraticCurveTo(0.2 * w, 0.95 * h, 0.32 * w, 0.82 * h);
    g.quadraticCurveTo(0.46 * w, 0.3 * h, 0.6 * w, 0.82 * h);
    g.quadraticCurveTo(0.72 * w, 0.52 * h, 0.84 * w, 0.82 * h); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.moveTo(0.04 * w, 0.88 * h); g.lineTo(0.96 * w, 0.88 * h); g.stroke();
    g.beginPath(); g.arc(0.46 * w, 0.36 * h, 8, 0, Math.PI * 2); g.stroke();
  },
  // 6. A split composite (VFX): plate on the left, matte on the right.
  (g, w, h) => {
    g.strokeRect(0.08 * w, 0.14 * h, 0.84 * w, 0.72 * h);
    g.beginPath(); g.moveTo(0.5 * w, 0.14 * h); g.lineTo(0.5 * w, 0.86 * h); g.stroke();
    g.beginPath(); g.moveTo(0.08 * w, 0.72 * h); g.lineTo(0.24 * w, 0.48 * h); g.lineTo(0.36 * w, 0.62 * h); g.lineTo(0.5 * w, 0.4 * h); g.stroke();
    g.save(); g.fillStyle = 'rgba(243, 239, 231, 0.18)';
    g.beginPath(); g.moveTo(0.5 * w, 0.4 * h); g.lineTo(0.64 * w, 0.58 * h); g.lineTo(0.76 * w, 0.44 * h); g.lineTo(0.92 * w, 0.7 * h); g.lineTo(0.92 * w, 0.86 * h); g.lineTo(0.5 * w, 0.86 * h); g.closePath(); g.fill(); g.restore();
    g.beginPath(); g.arc(0.25 * w, 0.32 * h, 7, 0, Math.PI * 2); g.stroke();
  },
];

function drawAtlas(canvas: HTMLCanvasElement, font: string): void {
  const g = canvas.getContext('2d');
  if (!g) return;
  const W = canvas.width, H = canvas.height, fw = W / FILM_FRAMES, k = H / 512;
  g.clearRect(0, 0, W, H);

  for (let f = 0; f < FILM_FRAMES; f++) {
    const x0 = f * fw;
    g.save();
    g.translate(x0, 0);
    // Base stock.
    g.fillStyle = BASE;
    g.fillRect(0, 0, fw, H);
    // Image area: a slightly lifted gate with a faint warm exposure.
    const ix = fw * 0.07, iy = 112 * k, iw = fw * 0.86, ih = H - 224 * k;
    const grad = g.createLinearGradient(0, iy, 0, iy + ih);
    grad.addColorStop(0, '#1e1812');
    grad.addColorStop(1, '#16110c');
    g.fillStyle = grad;
    g.fillRect(ix, iy, iw, ih);
    // Frame line between frames.
    g.fillStyle = '#060504';
    g.fillRect(0, 0, Math.max(2, 3 * k), H);
    // Perforations: four per side, punched out (alpha 0).
    g.globalCompositeOperation = 'destination-out';
    const pw = fw * 0.13, ph = 34 * k;
    for (let i = 0; i < 4; i++) {
      const px = fw * (0.125 + i * 0.25) - pw / 2;
      for (const py of [22 * k, H - 22 * k - ph]) {
        g.beginPath();
        g.roundRect(px, py, pw, ph, 5 * k);
        g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';
    // Edge print: amber, along the length, in the margin between perforations and image.
    g.fillStyle = AMBER;
    g.font = `500 ${Math.round(20 * k)}px ${font}`;
    g.textBaseline = 'middle';
    g.fillText(`AN · 25P · ${String(f + 1).padStart(4, '0')}`, fw * 0.08, 86 * k);
    g.fillRect(fw * 0.82, 80 * k, 10 * k, 12 * k); // a key-number tick
    // Pictogram: 1px line art in the gate.
    g.strokeStyle = LINE;
    g.lineWidth = Math.max(1, 1.5 * k);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.translate(ix + iw * 0.12, iy + ih * 0.12);
    PICTOGRAMS[f](g, iw * 0.76, ih * 0.76);
    g.restore();
  }
}

/**
 * Builds the atlas texture immediately (fallback mono font) and redraws it once the site's
 * mono font is ready, so the scene never waits on fonts.
 */
export function createFilmTexture(coarse: boolean): { texture: CanvasTexture; ready: Promise<void> } {
  const canvas = document.createElement('canvas');
  canvas.width = coarse ? 1024 : 1536;
  canvas.height = coarse ? 342 : 512;
  drawAtlas(canvas, 'ui-monospace, monospace');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.anisotropy = 4;
  const ready = resolveFont().then((font) => {
    drawAtlas(canvas, font);
    texture.needsUpdate = true;
  });
  return { texture, ready };
}
