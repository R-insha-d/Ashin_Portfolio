import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  type IUniform,
  Mesh,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderer,
} from 'three';
import { profile } from '@/content/profile';
import { PANEL_FRAG, PANEL_VERT, FLOOR_FRAG, FLOOR_VERT, HAZE_FRAG, BEAM_FRAG, DUST_VERT, DUST_FRAG, PLAIN_VERT, LABEL_FRAG, LABEL_VERT } from './orbit-shaders';
import { OB_LAYOUT, type ObDims, screenDims } from './orbit-shared';

/**
 * ORBIT: the projects as curved video screens on a ring around the camera (Projects page lab).
 * Plain three.js, created per mount and fully disposed. Only this module (and orbit-shaders)
 * import three; orbit.tsx loads it with a dynamic import after first paint.
 *
 * ---------------------------------------------------------------- API for the HUD (orbit.tsx)
 * new OrbitStage(options, callbacks), then `await stage.start()`; `stage.dispose()` on unmount.
 *
 * Methods
 *   goTo(i)          Rotate the shortest way to project i (thumb focus, category jump, player nav).
 *                    Counts as engaging the stage (see wheel policy).
 *   step(±1)         Previous / next project (arrow buttons). Also engages the stage.
 *   openActive()     Dolly in on the on-air screen and call onOpen(active).
 *   setDolly(on)     Camera in (player open) or back out (player closed).
 *   engage()         Capture the vertical wheel now (e.g. the HUD's own key handling).
 *   releaseWheel()   Give the vertical wheel back to the page at once (a "Scroll to continue"
 *                    button). Dwell capture stays off until the pointer leaves the stage.
 *   isWheelCaptured  Current wheel state (getter).
 *
 * Callbacks (all but the first five are optional)
 *   onReady, onFail, onActive(i), onOpen(i), onTime(seconds | null)  as before.
 *   onWheelCapture(captured)  The vertical wheel is now spinning the ring (true) or scrolling the
 *                             page (false). Show / hide a "Scroll to continue" control from it.
 *   onQuality(dpr, lowFx)     Adaptive quality changed (pixel ratio, effects reduced). Diagnostic.
 *
 * Attributes for CSS and probes:
 *   host   data-wheel="captured" | "free"   mirrors onWheelCapture
 *   host   data-quality="<dpr>[ low]"       current pixel ratio, " low" when dust / blur are off
 *   cursor data-kind="drag" | "play"        as before
 *   cursor data-over="air" | "screen" | "none"  what the pointer is over ("screen" = an off-air
 *                                               screen; a click spins it in, e.g. "Bring on air")
 *
 * Wheel policy (no traps). The vertical wheel scrolls the page until the visitor engages the
 * stage: pointer press or drag, a click, step()/goTo(), or the mouse resting over the stage for
 * about 600 ms (only after the mouse itself moved there; page scrolling under a still pointer never
 * engages). While engaged, vertical wheel steps projects; it releases at the first / last project,
 * immediately on a fast flick, when the stage is mostly off screen, and after 2 s without wheel
 * input. Horizontal and shift+wheel always spin the ring.
 *
 * Layout. One "arc" unit is one world unit along the ring. Every project has a slot centre laid out
 * from its off-air width (orbit-shared screenDims); the on-air screen grows to its full size and
 * pushes its neighbours apart. 4+ projects repeat `cycles` times so the ring closes; 1 to 3 sit on
 * a gentle flat arc with no repeats. The state is a single float `arc` (what is under the camera)
 * driven by drag, wheel and a spring.
 */

export type OrbitItem = {
  id: string;
  /** width / height of the media. */
  aspect: number;
  /** Poster URL (already sized), or null for the colour-bars card. */
  poster: string | null;
  /** 5 s muted loop, or null. */
  preview: string | null;
};

export type OrbitOptions = {
  canvas: HTMLCanvasElement;
  /** The element that receives pointer and wheel input (the stage box). */
  host: HTMLElement;
  /** Viewfinder brackets: positioned over the on-air slot each frame. */
  frame: HTMLElement | null;
  /** Small label that follows a fine pointer ("Play" / "Drag"). */
  cursor: HTMLElement | null;
  items: readonly OrbitItem[];
  /** CSS font-family for the floor numbers (the page's mono face). */
  labelFont: string;
  start: number;
  coarse: boolean;
  previews: boolean;
};

export type OrbitCallbacks = {
  onReady(): void;
  onFail(): void;
  /** The project nearest the camera changed. */
  onActive(index: number): void;
  /** The on-air screen was clicked; the camera is dollying in. */
  onOpen(index: number): void;
  /** Preview playhead in seconds, or null when nothing plays. */
  onTime(seconds: number | null): void;
  /** Vertical wheel captured by the stage (true) or handed back to the page (false). */
  onWheelCapture?(captured: boolean): void;
  /** Adaptive quality changed. */
  onQuality?(dpr: number, lowFx: boolean): void;
};

const BASE = -0.5; // screen bottoms
const FLOOR = BASE - 0.07;
const R_MIN = 3.7;
const FOV = 38;
const SEG_X = 28;
const SEG_Y = 6;
const GAP = OB_LAYOUT.gap;
const PUSH = OB_LAYOUT.offPush;
const VIDEO_FADE_IN = 0.25;
const VIDEO_FADE_OUT = 0.18;
const DWELL_MS = 600;
const IDLE_RELEASE_MS = 2000;
const FLICK_WINDOW_MS = 140;
const FLICK_PX = 650;

type Slot = {
  mesh: Mesh<BufferGeometry, ShaderMaterial>;
  refl: Mesh<BufferGeometry, ShaderMaterial>;
  label: Mesh<BufferGeometry, ShaderMaterial>;
  item: number;
  /** Arc position of the slot centre within one full ring. */
  at: number;
  air: number;
  fade: number;
  hover: number;
  /** Current size, radius and heading (written each frame, read by hit testing). */
  w: number;
  h: number;
  rad: number;
  theta: number;
  d0: number;
};

type ProjectGpu = {
  on: ObDims;
  off: ObDims;
  shared: {
    uMap: IUniform<Texture | null>;
    uHasMap: IUniform<number>;
    uMapAspect: IUniform<number>;
    uVid: IUniform<Texture | null>;
    uVidMix: IUniform<number>;
    uVidAspect: IUniform<number>;
    uSeed: IUniform<number>;
  };
  poster: Texture | null;
  posterAspect: number;
  posterState: 'idle' | 'loading' | 'done' | 'error';
  /** Room colour sampled from the poster (linear), or null for grey posters (amber is used). */
  tint: Color | null;
};

const wrapPi = (a: number) => {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (cur: number, to: number, lambda: number, dt: number) => cur + (to - cur) * (1 - Math.exp(-lambda * dt));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

/** On-air screen size in world units (reels are 1 tall, wide films at most 1.38 wide). */
export function panelSize(aspect: number): { w: number; h: number } {
  return screenDims(aspect).on;
}

/** A uv grid; the vertex shader bends and sizes it (one geometry for every screen). */
function gridGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  const cols = SEG_X + 1;
  const rows = SEG_Y + 1;
  const pos = new Float32Array(cols * rows * 3);
  const uv = new Float32Array(cols * rows * 2);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const k = y * cols + x;
      pos[k * 3] = x / SEG_X;
      pos[k * 3 + 1] = y / SEG_Y;
      uv[k * 2] = x / SEG_X;
      uv[k * 2 + 1] = y / SEG_Y;
    }
  }
  const idx: number[] = [];
  for (let y = 0; y < SEG_Y; y++) {
    for (let x = 0; x < SEG_X; x++) {
      const a = y * cols + x;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('uv', new BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * The poster's room colour: a saturation-weighted average from a tiny copy, pushed to a usable
 * light colour (fixed lightness, bounded saturation). Null when the poster is essentially grey.
 */
function posterTint(img: HTMLImageElement): Color | null {
  try {
    const S = 24;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.drawImage(img, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data;
    let r = 0, gg = 0, b = 0, wsum = 0;
    for (let k = 0; k < d.length; k += 4) {
      const R = d[k] / 255, G = d[k + 1] / 255, B = d[k + 2] / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      const sat = mx > 0 ? (mx - mn) / mx : 0;
      const wgt = sat * sat * (0.15 + mx);
      r += R * wgt; gg += G * wgt; b += B * wgt; wsum += wgt;
    }
    if (wsum < 0.6) return null;
    const col = new Color().setRGB(r / wsum, gg / wsum, b / wsum, SRGBColorSpace);
    const hsl = { h: 0, s: 0, l: 0 };
    col.getHSL(hsl, SRGBColorSpace);
    if (hsl.s < 0.12) return null;
    return new Color().setHSL(hsl.h, clamp(hsl.s, 0.45, 0.85), 0.56, SRGBColorSpace);
  } catch {
    return null;
  }
}

export class OrbitStage {
  private readonly o: OrbitOptions;
  private readonly cb: OrbitCallbacks;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.05, 60);
  private readonly ray = new Raycaster();
  private readonly n: number;
  /** Ring closes on itself (4+ projects); otherwise a flat arc without repeats. */
  private readonly loop: boolean;
  private readonly L: number; // arc length of one sequence
  private readonly cycles: number;
  private readonly R: number;
  private readonly centers: number[] = [];
  private readonly projects: ProjectGpu[] = [];
  private readonly slots: Slot[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly bg = new Color('#0b0b0c');
  private readonly amber = new Color('#ffb547');
  private readonly tintTo = new Color('#ffb547');
  private readonly global = {
    uTime: { value: 0 } as IUniform<number>,
    uVel: { value: 0 } as IUniform<number>,
    uBg: { value: new Color('#0b0b0c') } as IUniform<Color>,
    uAmber: { value: new Color('#ffb547') } as IUniform<Color>,
    uTint: { value: new Color('#ffb547') } as IUniform<Color>,
    uHaze: { value: new Vector2(2.6, 7.5) } as IUniform<Vector2>,
    uQuality: { value: 1 } as IUniform<number>,
  };
  private readonly fontReady: IUniform<number> = { value: 0 };
  private floorMat!: ShaderMaterial;
  private beamMat!: ShaderMaterial;
  private dustMat!: ShaderMaterial;
  private dust!: Points;
  private glowMat!: ShaderMaterial;
  private glow!: Mesh;
  private atlas!: CanvasTexture;
  private atlasCanvas!: HTMLCanvasElement;
  private grid!: BufferGeometry;
  private fallback: { tall: CanvasTexture | null; wide: CanvasTexture | null } = { tall: null, wide: null };
  private fontsOk = false;

  // Motion state.
  private arc = 0;
  private vel = 0;
  private target: number | null = null;
  private stiffness = 70;
  private active = -1;
  private settledFor = 0;
  private visVel = 0;
  private intro = 0; // 0 → 1
  private sweep = -1; // landing glint progress, -1 = idle
  private dolly = 0;
  private dollyTo = 0;
  private dist = 3;
  private lookY = 0;
  private frameW = 0;
  private frameH = 0;
  private airW = 0.5625;
  private airH = 1;
  private parallax = new Vector2();
  private parallaxTo = new Vector2();

  // Input.
  private drag: { id: number; x0: number; y0: number; t0: number; lastX: number; lastT: number; moved: boolean; v: number } | null = null;
  private wheelAcc = 0;
  private wheelLast = 0;
  private wheelStepAt = 0;
  private hoverAir = false;
  private hoverSlot = -1;
  // Wheel capture.
  private captured = false;
  private idleTimer = 0;
  private dwellTimer = 0;
  private dwellArmed = true;
  private pointerInside = false;
  private lastPointer = { x: NaN, y: NaN };
  /** The current pointermove really moved (browsers re-send the old position after a scroll). */
  private realMove = false;
  private lastFreeWheel = 0;
  private flick: Array<{ t: number; d: number }> = [];

  // Loop.
  private raf = 0;
  private last = 0;
  private startedAt = 0;
  private visible = true;
  private disposed = false;
  private failed = false;
  private readyFired = false;
  private width = 1;
  private height = 1;
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;

  // Adaptive quality.
  private readonly dprMax: number;
  private dpr: number;
  private lowFx: boolean;
  private ftEma = 16.7;
  private slowFor = 0;
  private fastFor = 0;
  private drops = 0;
  private ups = 0;

  // Preview video (at most one decoding; the old one is torn down before the next starts).
  private video: HTMLVideoElement | null = null;
  private videoTex: VideoTexture | null = null;
  private videoFor = -1;
  /** 0 = waiting for a presented frame, 1 = fading in / on, -1 = fading out before teardown. */
  private videoPhase: 0 | 1 | -1 = 0;
  private videoArmFrames = -1;
  private frameNo = 0;

  constructor(o: OrbitOptions, cb: OrbitCallbacks) {
    this.o = o;
    this.cb = cb;
    this.n = o.items.length;
    this.loop = this.n >= 4;

    const fine = !o.coarse && window.matchMedia('(pointer: fine)').matches;
    this.renderer = new WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: false, powerPreference: fine ? 'high-performance' : 'default' });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.dprMax = Math.min(window.devicePixelRatio || 1, o.coarse ? 1.75 : 2);
    this.dpr = this.dprMax;
    this.lowFx = o.coarse;
    this.global.uQuality.value = this.lowFx ? 0 : 1;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(this.bg, 1);
    this.scene.background = this.bg;

    // Layout from off-air widths; the on-air screen pushes neighbours apart at run time.
    let acc = 0;
    o.items.forEach((it, i) => {
      const { on, off } = screenDims(it.aspect);
      this.centers.push(acc + off.w / 2);
      acc += off.w + GAP;
      this.projects.push({
        on,
        off,
        shared: {
          uMap: { value: null },
          uHasMap: { value: 0 },
          uMapAspect: { value: on.w / on.h },
          uVid: { value: null },
          uVidMix: { value: 0 },
          uVidAspect: { value: on.w / on.h },
          uSeed: { value: (i * 0.618) % 1 },
        },
        poster: null,
        posterAspect: on.w / on.h,
        posterState: 'idle',
        tint: null,
      });
    });
    this.L = acc;
    if (this.loop) {
      this.cycles = Math.max(1, Math.ceil((Math.PI * 2 * R_MIN) / this.L));
      this.R = (this.cycles * this.L) / (Math.PI * 2);
    } else {
      this.cycles = 1;
      this.R = Math.max(OB_LAYOUT.flatRadius, this.L);
    }

    this.grid = gridGeometry();
    this.disposables.push(this.grid);
    this.buildWorld();

    // Floor numbers: one atlas (drawn once the mono face has loaded), one flat plane per slot.
    this.atlasCanvas = document.createElement('canvas');
    this.atlasCanvas.width = 128 * Math.max(1, this.n);
    this.atlasCanvas.height = 64;
    this.atlas = new CanvasTexture(this.atlasCanvas);
    this.atlas.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    // Stretched in depth (anamorphic) so the numbers read upright from the low camera.
    const labelGeo = new PlaneGeometry(0.22, 0.3);
    labelGeo.rotateX(-Math.PI / 2);
    labelGeo.translate(0, FLOOR + 0.003, -(this.R - 0.24));
    this.disposables.push(labelGeo, this.atlas);

    for (let c = 0; c < this.cycles; c++) {
      for (let i = 0; i < this.n; i++) {
        const p = this.projects[i];
        const mk = (reflect: number) => {
          const mat = new ShaderMaterial({
            vertexShader: PANEL_VERT,
            fragmentShader: PANEL_FRAG,
            transparent: true,
            depthWrite: reflect === 0,
            depthTest: reflect === 0,
            side: DoubleSide,
            uniforms: {
              ...p.shared,
              ...this.global,
              uDim: { value: new Vector2(p.off.w, p.off.h) },
              uRad: { value: this.R + PUSH },
              uBase: { value: BASE },
              uFocus: { value: 0 },
              uHover: { value: 0 },
              uFar: { value: 0 },
              uAir: { value: 0 },
              uFade: { value: 0 },
              uReflect: { value: reflect },
              uFloor: { value: FLOOR },
              uSweep: { value: -1 },
            },
          });
          this.disposables.push(mat);
          const mesh = new Mesh(this.grid, mat);
          mesh.frustumCulled = false;
          mesh.renderOrder = reflect ? 1 : 3;
          this.scene.add(mesh);
          return mesh;
        };
        const mesh = mk(0);
        const refl = mk(1);
        const labelMat = new ShaderMaterial({
          vertexShader: LABEL_VERT,
          fragmentShader: LABEL_FRAG,
          transparent: true,
          depthWrite: false,
          uniforms: {
            ...this.global,
            uAtlas: { value: this.atlas },
            uCell: { value: i },
            uCount: { value: Math.max(1, this.n) },
            uAir: { value: 0 },
            uFade: { value: 0 },
            uReady: this.fontReady,
          },
        });
        this.disposables.push(labelMat);
        const label = new Mesh(labelGeo, labelMat);
        label.renderOrder = 2;
        this.scene.add(label);
        this.slots.push({ mesh, refl, label, item: i, at: c * this.L + this.centers[i], air: 0, fade: 0, hover: 0, w: p.off.w, h: p.off.h, rad: this.R + PUSH, theta: 0, d0: 0 });
      }
    }

    // Intro: a loop spins in from a third of a turn back; a flat arc slides in from the right.
    const start = clamp(o.start, 0, this.n - 1);
    const home = this.centers[start];
    this.arc = this.loop ? home - Math.min(this.L * this.cycles * 0.3, 7) : home + Math.min(1.4, this.L + 0.6);
    this.target = home;
    this.stiffness = 7;
    const f = this.fitFor(start, 1);
    this.dist = f.dist * 1.55;
    this.lookY = f.lookY;

    o.host.dataset.wheel = 'free';
    o.canvas.addEventListener('webglcontextlost', this.onLost);
    o.host.addEventListener('pointerdown', this.onDown);
    o.host.addEventListener('pointermove', this.onMove);
    o.host.addEventListener('pointerup', this.onUp);
    o.host.addEventListener('pointercancel', this.onCancel);
    o.host.addEventListener('pointerleave', this.onLeave);
    o.host.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onAnyMove, { capture: true, passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(o.host);
    this.io = new IntersectionObserver(([e]) => this.setVisible(e.isIntersecting), { rootMargin: '120px 0px' });
    this.io.observe(o.host);
    this.resize();
    this.setQualityAttr();
    void this.whenFonts();
  }

  // ------------------------------------------------------------------ world

  private buildWorld() {
    const R = this.R;

    // Haze: a far backdrop glow seen through the gaps and above the screens.
    const hazeGeo = new PlaneGeometry(34 + R * 2, 14);
    const hazeMat = new ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: HAZE_FRAG,
      depthWrite: false,
      uniforms: { ...this.global },
    });
    const haze = new Mesh(hazeGeo, hazeMat);
    haze.position.set(0, 0.6, -R - 5);
    haze.renderOrder = -2;
    this.scene.add(haze);
    this.disposables.push(hazeGeo, hazeMat);

    // Floor: glossy black with a timeline ruler that turns with the ring.
    const floorGeo = new PlaneGeometry(R * 2 + 16, R * 2 + 16);
    floorGeo.rotateX(-Math.PI / 2);
    this.floorMat = new ShaderMaterial({
      vertexShader: FLOOR_VERT,
      fragmentShader: FLOOR_FRAG,
      depthWrite: true,
      uniforms: {
        ...this.global,
        uR: { value: R },
        uArc: { value: 0 },
        uCam: { value: new Vector3() },
        uSpot: { value: 1 },
      },
    });
    const floor = new Mesh(floorGeo, this.floorMat);
    floor.position.y = FLOOR;
    floor.renderOrder = 0;
    this.scene.add(floor);
    this.disposables.push(floorGeo, this.floorMat);

    // On-air glow: a soft halo just behind the front slot.
    const glowGeo = new PlaneGeometry(3.6, 2.6);
    this.glowMat = new ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: HAZE_FRAG.replace('/*GLOW*/', '#define GLOW'),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { ...this.global, uStrength: { value: 0 } },
    });
    this.glow = new Mesh(glowGeo, this.glowMat);
    this.glow.position.set(0, 0.05, -R - 0.25);
    this.glow.renderOrder = 2;
    this.scene.add(this.glow);
    this.disposables.push(glowGeo, this.glowMat);

    // A faint key-light beam from above, in front of the on-air slot, with drifting dust.
    const beamGeo = new PlaneGeometry(2.2, 3.4);
    this.beamMat = new ShaderMaterial({
      vertexShader: PLAIN_VERT,
      fragmentShader: BEAM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { ...this.global, uStrength: { value: 0 } },
    });
    const beam = new Mesh(beamGeo, this.beamMat);
    beam.position.set(0, FLOOR + 1.7, -R + 0.45);
    // Drawn before the screens so the shaft lights the room around the hero, never its picture.
    beam.renderOrder = 2.5;
    this.scene.add(beam);
    this.disposables.push(beamGeo, this.beamMat);

    const count = 140;
    const dust = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      dust[i * 3] = (Math.random() - 0.5) * 2.0;
      dust[i * 3 + 1] = Math.random();
      dust[i * 3 + 2] = -R + 0.25 + Math.random() * 1.3;
      seed[i] = Math.random();
    }
    const dustGeo = new BufferGeometry();
    dustGeo.setAttribute('position', new BufferAttribute(dust, 3));
    dustGeo.setAttribute('seed', new BufferAttribute(seed, 1));
    this.dustMat = new ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        ...this.global,
        uFloor: { value: FLOOR },
        uPx: { value: 1 },
        uStrength: { value: 0 },
      },
    });
    this.dust = new Points(dustGeo, this.dustMat);
    this.dust.frustumCulled = false;
    this.dust.renderOrder = 5;
    this.dust.visible = !this.lowFx;
    this.scene.add(this.dust);
    this.disposables.push(dustGeo, this.dustMat);
  }

  /** Canvas text (floor numbers, colour-bars cards) is drawn only with the real faces loaded. */
  private async whenFonts() {
    const fonts = document.fonts;
    const sans = getComputedStyle(document.body).fontFamily || 'sans-serif';
    try {
      if (fonts) {
        await Promise.race([
          Promise.all([fonts.load(`500 44px ${this.o.labelFont}`, '0123456789'), fonts.load(`800 120px ${sans}`, profile.initials), fonts.ready]),
          new Promise((r) => window.setTimeout(r, 4000)),
        ]);
      }
    } catch {
      /* draw with whatever is available */
    }
    if (this.disposed) return;
    this.fontsOk = true;
    this.drawText();
    // A face that finishes later (slow network) redraws the canvases.
    fonts?.addEventListener?.('loadingdone', this.onFontsDone);
  }

  private onFontsDone = () => {
    if (!this.disposed) this.drawText();
  };

  private drawText() {
    const c = this.atlasCanvas;
    const g = c.getContext('2d');
    if (g) {
      const cw = 128;
      g.fillStyle = '#000';
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `500 44px ${this.o.labelFont}`;
      for (let i = 0; i < this.n; i++) g.fillText(String(i + 1).padStart(2, '0'), cw * i + cw / 2, c.height / 2 + 2);
      this.atlas.needsUpdate = true;
    }
    // Redraw any colour-bars cards already in use.
    for (const k of ['tall', 'wide'] as const) {
      const t = this.fallback[k];
      if (t) {
        this.paintBars(t.image as HTMLCanvasElement, k === 'wide');
        t.needsUpdate = true;
      }
    }
    this.projects.forEach((p, i) => {
      if (p.posterState === 'error' || (p.posterState === 'idle' && !this.o.items[i].poster)) this.useFallback(i);
    });
  }

  /** EBU colour bars with the site monogram: the card for a missing or broken poster. */
  private paintBars(c: HTMLCanvasElement, wide: boolean) {
    const g = c.getContext('2d');
    if (!g) return;
    const W = c.width;
    const H = c.height;
    g.fillStyle = '#0e0e10';
    g.fillRect(0, 0, W, H);
    const bars = ['#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00', '#bf00bf', '#bf0000', '#0000bf'];
    const rev = ['#0000bf', '#131313', '#bf00bf', '#131313', '#00bfbf', '#131313', '#bfbfbf'];
    const top = H * (wide ? 0.62 : 0.56);
    const bw = W / 7;
    bars.forEach((col, i) => { g.fillStyle = col; g.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), top); });
    rev.forEach((col, i) => { g.fillStyle = col; g.fillRect(Math.floor(i * bw), top, Math.ceil(bw), H * 0.07); });
    // Pluge strip.
    const py = top + H * 0.07;
    const pl = ['#00214c', '#ffffff', '#32006a', '#131313', '#090909', '#131313', '#1d1d1d', '#131313'];
    const pw = W / pl.length;
    pl.forEach((col, i) => { g.fillStyle = col; g.fillRect(Math.floor(i * pw), py, Math.ceil(pw), H - py); });
    // Monogram plate in the middle.
    const sans = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const s = Math.min(W, H) * 0.36;
    const cx = W / 2;
    const cy = top * 0.62;
    g.fillStyle = 'rgba(11, 11, 12, 0.92)';
    g.fillRect(cx - s * 0.75, cy - s * 0.5, s * 1.5, s);
    g.strokeStyle = '#ffb547';
    g.lineWidth = Math.max(2, s * 0.025);
    const k = s * 0.2;
    const x0 = cx - s * 0.75, x1 = cx + s * 0.75, y0 = cy - s * 0.5, y1 = cy + s * 0.5;
    g.beginPath();
    g.moveTo(x0, y0 + k); g.lineTo(x0, y0); g.lineTo(x0 + k, y0);
    g.moveTo(x1 - k, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + k);
    g.moveTo(x1, y1 - k); g.lineTo(x1, y1); g.lineTo(x1 - k, y1);
    g.moveTo(x0 + k, y1); g.lineTo(x0, y1); g.lineTo(x0, y1 - k);
    g.stroke();
    g.fillStyle = '#f2efe9';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `800 ${Math.round(s * 0.46)}px ${sans}`;
    g.fillText(profile.initials, cx, cy + s * 0.02);
  }

  private useFallback(i: number) {
    if (!this.fontsOk) return; // the loading slate shows until the faces are in
    const p = this.projects[i];
    const wide = p.on.w > p.on.h;
    const key = wide ? 'wide' : 'tall';
    let t = this.fallback[key];
    if (!t) {
      const c = document.createElement('canvas');
      c.width = wide ? 640 : 360;
      c.height = wide ? 360 : 640;
      this.paintBars(c, wide);
      t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.fallback[key] = t;
      this.disposables.push(t);
    }
    p.shared.uMap.value = t;
    p.shared.uHasMap.value = 1;
    p.shared.uMapAspect.value = wide ? 16 / 9 : 9 / 16;
  }

  // ------------------------------------------------------------------ public

  async start(): Promise<void> {
    this.startedAt = performance.now();
    // Posters for the first few slots, then show (at most 2.5 s wait).
    this.ensurePosters(clamp(this.o.start, 0, this.n - 1));
    const first = this.projects.slice(0, Math.min(this.n, 4)).map((_, i) => this.loadPoster(i));
    await Promise.race([Promise.allSettled(first), new Promise((r) => window.setTimeout(r, 2500))]);
    if (this.disposed) return;
    this.renderer.compile(this.scene, this.camera);
    this.last = performance.now();
    this.startedAt = this.last;
    this.loop_();
  }

  /** Rotate the shortest way to a project (DOM index, focus, category jump, player prev/next). */
  goTo(index: number) {
    if (index < 0 || index >= this.n) return;
    if (this.loop) {
      const from = this.target ?? this.arc;
      const base = this.centers[index];
      this.target = base + this.L * Math.round((from - base) / this.L);
    } else {
      this.target = this.centers[index];
    }
    if (this.intro >= 1) this.stiffness = 70;
    this.engage();
  }

  step(dir: 1 | -1) {
    if (this.n < 2) return;
    this.stepBy(dir);
    this.engage();
  }

  private stepBy(dir: 1 | -1) {
    const from = this.nearest(this.target ?? this.arc);
    const i = from.item;
    const next = dir > 0 ? (i + 1) % this.n : (i - 1 + this.n) % this.n;
    if (this.loop) {
      let d = this.centers[next] - this.centers[i];
      if (dir > 0 && next <= i) d += this.L;
      if (dir < 0 && next >= i) d -= this.L;
      this.target = from.arc + d;
    } else {
      this.target = this.centers[next];
    }
    if (this.intro >= 1) this.stiffness = 70;
  }

  /** Camera dolly into the on-air screen (player open) or back out. */
  setDolly(on: boolean) {
    this.dollyTo = on ? 1 : 0;
  }

  /** Dolly in and ask the page to open the player. */
  openActive() {
    if (this.active < 0) return;
    const i = this.active;
    this.target = this.nearest(this.target ?? this.arc).arc;
    this.dollyTo = 1;
    this.cb.onOpen(i);
  }

  /** Capture the vertical wheel (released again by the policy in the header comment). */
  engage() {
    if (this.n < 2 || this.disposed) return;
    this.setCaptured(true);
    this.armIdle();
  }

  /** Hand the vertical wheel back to the page now; dwell re-arms when the pointer leaves. */
  releaseWheel() {
    this.dwellArmed = false;
    window.clearTimeout(this.dwellTimer);
    this.setCaptured(false);
  }

  get isWheelCaptured(): boolean {
    return this.captured;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.dwellTimer);
    this.teardownVideo();
    const { host, canvas } = this.o;
    canvas.removeEventListener('webglcontextlost', this.onLost);
    host.removeEventListener('pointerdown', this.onDown);
    host.removeEventListener('pointermove', this.onMove);
    host.removeEventListener('pointerup', this.onUp);
    host.removeEventListener('pointercancel', this.onCancel);
    host.removeEventListener('pointerleave', this.onLeave);
    host.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('pointermove', this.onAnyMove, { capture: true });
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.fonts?.removeEventListener?.('loadingdone', this.onFontsDone);
    delete host.dataset.wheel;
    delete host.dataset.quality;
    host.style.cursor = '';
    this.ro?.disconnect();
    this.io?.disconnect();
    for (const p of this.projects) p.poster?.dispose();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ------------------------------------------------------------------ layout helpers

  private nearest(a: number): { arc: number; item: number } {
    if (!this.loop) {
      let best = Infinity;
      let item = 0;
      for (let i = 0; i < this.n; i++) {
        const d = Math.abs(this.centers[i] - a);
        if (d < best) {
          best = d;
          item = i;
        }
      }
      return { arc: this.centers[item], item };
    }
    const cyc = Math.floor(a / this.L);
    const local = a - cyc * this.L;
    let best = Infinity;
    let arc = 0;
    let item = 0;
    for (let i = 0; i < this.n; i++) {
      for (const off of [-this.L, 0, this.L]) {
        const c = this.centers[i] + off;
        const d = Math.abs(c - local);
        if (d < best) {
          best = d;
          arc = cyc * this.L + c;
          item = i;
        }
      }
    }
    return { arc, item };
  }

  /** Camera distance and look height that frame project `i` (on-air size) in the current viewport. */
  private fitFor(i: number, aspect = this.width / this.height) {
    const p = this.projects[i].on;
    const t = 2 * Math.tan((FOV * Math.PI) / 360);
    const fit = aspect < 0.9 ? OB_LAYOUT.fitPhone : OB_LAYOUT.fitWide;
    // Never back the camera out of the ring.
    const dist = Math.min(Math.max(p.h / (fit.h * t), p.w / (fit.w * t * aspect), 1.2), this.R * 1.6);
    const viewH = dist * t;
    const centre = BASE + p.h / 2;
    // Sit the screen above the middle so the reflection and the lower HUD have room (phones more).
    return { dist, lookY: centre - viewH * (aspect < 0.9 ? 0.075 : 0.045) };
  }

  private resize() {
    const r = this.o.host.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.dustMat.uniforms.uPx.value = this.dpr * (this.height / 700);
  }

  private wrapArc(d: number) {
    if (!this.loop) return d;
    const C = this.L * this.cycles;
    return wrapPi((d / C) * Math.PI * 2) * (C / (Math.PI * 2));
  }

  // ------------------------------------------------------------------ adaptive quality

  /** Frame-time driven pixel ratio: 2 → 1.5 → 1.25 → 1, then effects off; creeps back up when fast. */
  private measure(dtMs: number) {
    const now = performance.now();
    if (dtMs > 120 || now - this.startedAt < 1500) return;
    this.ftEma = this.ftEma * 0.92 + dtMs * 0.08;
    const dt = dtMs / 1000;
    if (this.ftEma > 20) {
      this.slowFor += dt;
      this.fastFor = 0;
    } else if (this.ftEma < 12.5) {
      this.fastFor += dt;
      this.slowFor = 0;
    } else {
      this.slowFor = 0;
      this.fastFor = 0;
    }
    if (this.slowFor > 0.9) {
      this.slowFor = 0;
      this.ftEma = 16.7;
      this.drops++;
      if (this.dpr > 1) {
        this.dpr = this.dpr > 1.5 ? 1.5 : this.dpr > 1.25 ? 1.25 : 1;
        this.resize();
      }
      // A sustained drop (twice, or already at 1x) also turns the extras off.
      if (!this.lowFx && (this.drops >= 2 || this.dpr <= 1)) this.setLowFx(true);
      this.setQualityAttr();
    } else if (this.fastFor > 5 && this.ups < 2 && this.dpr < this.dprMax) {
      this.fastFor = 0;
      this.ups++;
      this.dpr = Math.min(this.dprMax, this.dpr + 0.25);
      this.resize();
      this.setQualityAttr();
    }
  }

  private setLowFx(v: boolean) {
    this.lowFx = v;
    this.dust.visible = !v;
    this.global.uQuality.value = v ? 0 : 1;
  }

  private setQualityAttr() {
    this.o.host.dataset.quality = `${this.dpr}${this.lowFx ? ' low' : ''}`;
    this.cb.onQuality?.(this.dpr, this.lowFx);
  }

  // ------------------------------------------------------------------ posters and preview

  private ensurePosters(center: number) {
    const span = Math.min(this.n, 7);
    for (let d = -3; d <= 3 && d < span; d++) {
      const i = ((center + d) % this.n + this.n) % this.n;
      void this.loadPoster(i);
    }
  }

  private loadPoster(i: number): Promise<void> {
    const p = this.projects[i];
    const url = this.o.items[i].poster;
    if (p.posterState !== 'idle') return Promise.resolve();
    if (!url) {
      p.posterState = 'error';
      this.useFallback(i);
      return Promise.resolve();
    }
    p.posterState = 'loading';
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (this.disposed) return resolve();
        const tex = new Texture(img);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        tex.needsUpdate = true;
        p.poster = tex;
        p.posterAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
        p.posterState = 'done';
        p.tint = posterTint(img);
        p.shared.uMap.value = tex;
        p.shared.uHasMap.value = 1;
        p.shared.uMapAspect.value = p.posterAspect;
        if (i === this.active) this.setTintTarget(i);
        resolve();
      };
      img.onerror = () => {
        p.posterState = 'error';
        this.useFallback(i);
        resolve();
      };
      img.src = url;
    });
  }

  private setTintTarget(i: number) {
    const t = this.projects[i]?.tint;
    // Keep a little amber in every room so the brand warmth never disappears.
    if (t) this.tintTo.copy(t).lerp(this.amber, 0.2);
    else this.tintTo.copy(this.amber);
  }

  private startPreview(i: number) {
    if (this.video) return; // one decoding video at a time; the old one is still fading out
    const src = this.o.items[i].preview;
    if (!this.o.previews || !src) return;
    const v = document.createElement('video');
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.src = src;
    const tex = new VideoTexture(v);
    // Uploaded with a linear transfer by three; PANEL_FRAG decodes it (see orbit-shaders).
    tex.colorSpace = SRGBColorSpace;
    tex.generateMipmaps = false;
    this.video = v;
    this.videoTex = tex;
    this.videoFor = i;
    this.videoPhase = 0;
    this.videoArmFrames = -1;
    const p = this.projects[i];
    const arm = () => {
      if (this.video !== v || this.disposed || this.videoPhase !== 0) return;
      p.shared.uVid.value = tex;
      p.shared.uVidAspect.value = (v.videoWidth || 9) / (v.videoHeight || 16);
      // Wait two rendered frames so the first video frame is on the GPU before the fade starts.
      this.videoArmFrames = this.frameNo + 2;
    };
    // Fade only once a real frame has been presented (no flash of an empty texture).
    if (typeof v.requestVideoFrameCallback === 'function') v.requestVideoFrameCallback(() => arm());
    else v.addEventListener('playing', () => window.setTimeout(arm, 60), { once: true });
    void v.play().catch(() => {});
  }

  /** Fade the on-air video back to its poster, then tear it down. */
  private stopPreview() {
    if (!this.video) return;
    if (this.videoPhase === 1) this.videoPhase = -1;
    else this.teardownVideo();
  }

  private teardownVideo() {
    const v = this.video;
    const i = this.videoFor;
    if (v) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    this.videoTex?.dispose();
    this.video = null;
    this.videoTex = null;
    this.videoFor = -1;
    this.videoPhase = 0;
    this.videoArmFrames = -1;
    if (i >= 0) {
      const s = this.projects[i].shared;
      s.uVid.value = null;
      s.uVidMix.value = 0;
    }
    if (!this.disposed) this.cb.onTime(null);
  }

  private updateVideo(dt: number) {
    if (!this.video) return;
    const s = this.projects[this.videoFor].shared;
    if (this.videoPhase === 0 && this.videoArmFrames >= 0 && this.frameNo >= this.videoArmFrames) this.videoPhase = 1;
    if (this.videoPhase === 1) {
      s.uVidMix.value = Math.min(1, s.uVidMix.value + dt / VIDEO_FADE_IN);
      this.cb.onTime(this.video.currentTime);
    } else if (this.videoPhase === -1) {
      s.uVidMix.value = Math.max(0, s.uVidMix.value - dt / VIDEO_FADE_OUT);
      if (s.uVidMix.value <= 0) this.teardownVideo();
    }
  }

  // ------------------------------------------------------------------ input

  private onLost = (e: Event) => {
    e.preventDefault();
    this.fail();
  };

  private fail() {
    if (this.failed || this.disposed) return;
    this.failed = true;
    cancelAnimationFrame(this.raf);
    this.cb.onFail();
  }

  private pxToArc() {
    const t = 2 * Math.tan((FOV * Math.PI) / 360);
    const viewW = this.dist * t * (this.width / this.height);
    return (viewW / this.width) * 1.15;
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.intro < 0.6) return;
    if (e.target instanceof Element && e.target.closest('button, a')) return;
    this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), lastX: e.clientX, lastT: performance.now(), moved: false, v: 0 };
    if (e.pointerType === 'mouse') {
      this.o.host.setPointerCapture(e.pointerId);
      this.engage();
    }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.drag && e.target instanceof Element && e.target.closest('button, a')) {
      this.clearHover();
      return;
    }
    const r = this.o.host.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (e.pointerType === 'mouse') {
      this.parallaxTo.set((x / r.width) * 2 - 1, (y / r.height) * 2 - 1);
      // Dwell: only real mouse movement over the stage starts it (not the page scrolling under it).
      this.pointerInside = true;
      if (this.realMove && !this.captured && this.dwellArmed && !this.dwellTimer) {
        this.dwellTimer = window.setTimeout(this.onDwell, DWELL_MS);
      }
    }
    const d = this.drag;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.lastX;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6) {
        // Mostly vertical touch movement belongs to the page (touch-action: pan-y handles it).
        if (e.pointerType !== 'mouse' && Math.abs(e.clientY - d.y0) > Math.abs(e.clientX - d.x0)) {
          this.drag = null;
          return;
        }
        d.moved = true;
        if (e.pointerType !== 'mouse') {
          try { this.o.host.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        }
      }
      if (d.moved) {
        const now = performance.now();
        let da = -dx * this.pxToArc();
        // Flat arc: rubber band past the first and last screen.
        if (!this.loop) {
          const lo = this.centers[0];
          const hi = this.centers[this.n - 1];
          const over = this.arc < lo ? lo - this.arc : this.arc > hi ? this.arc - hi : 0;
          if (over > 0 && Math.sign(da) === Math.sign(this.arc - (lo + hi) / 2)) da *= 1 / (1 + over * 6);
        }
        this.arc += da;
        const dt = Math.max(1, now - d.lastT) / 1000;
        d.v = d.v * 0.6 + (da / dt) * 0.4;
        this.vel = d.v;
        this.target = null;
        d.lastX = e.clientX;
        d.lastT = now;
      }
    }
    this.updateCursor(x, y, e.pointerType === 'mouse');
  };

  /** Window-level (capture) so the last position is known even when it was outside the stage. */
  private onAnyMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    this.realMove = e.clientX !== this.lastPointer.x || e.clientY !== this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };

  private onDwell = () => {
    this.dwellTimer = 0;
    if (this.captured || !this.dwellArmed || !this.pointerInside || this.intro < 0.6) return;
    if (performance.now() - this.lastFreeWheel < DWELL_MS - 50) return;
    if (this.shownFraction() < 0.82) return;
    // One dwell per visit: after this capture is released, the pointer must leave first.
    this.dwellArmed = false;
    this.engage();
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (this.o.host.hasPointerCapture(e.pointerId)) this.o.host.releasePointerCapture(e.pointerId);
    if (!d.moved) {
      if (performance.now() - d.t0 < 600) this.click(e);
      return;
    }
    // Inertia: aim at the slot nearest where the throw would coast to, then spring there.
    const idle = performance.now() - d.lastT > 80;
    const v = idle ? 0 : clamp(d.v, -14, 14);
    this.vel = v;
    this.target = this.nearest(this.arc + v * 0.32).arc;
    this.stiffness = 46;
  };

  private onCancel = (e: PointerEvent) => {
    if (this.drag?.id !== e.pointerId) return;
    const moved = this.drag.moved;
    this.drag = null;
    if (moved) {
      this.target = this.nearest(this.arc).arc;
      this.stiffness = 46;
    }
  };

  private clearHover() {
    this.parallaxTo.set(0, 0);
    this.hoverAir = false;
    this.hoverSlot = -1;
    const c = this.o.cursor;
    if (c) c.dataset.show = 'false';
  }

  private onLeave = () => {
    this.clearHover();
    this.pointerInside = false;
    this.dwellArmed = true;
    window.clearTimeout(this.dwellTimer);
    this.dwellTimer = 0;
  };

  /** Analytic hit test: the pointer ray against each visible screen's cylinder slice. */
  private hit(clientX: number, clientY: number): Slot | null {
    const r = this.o.host.getBoundingClientRect();
    const ndc = new Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const o = this.ray.ray.origin;
    const dir = this.ray.ray.direction;
    let best: Slot | null = null;
    let bestT = Infinity;
    for (const s of this.slots) {
      if (!s.mesh.visible || s.fade < 0.5) continue;
      const rad = s.rad;
      const a = dir.x * dir.x + dir.z * dir.z;
      const b = 2 * (o.x * dir.x + o.z * dir.z);
      const c = o.x * o.x + o.z * o.z - rad * rad;
      const disc = b * b - 4 * a * c;
      if (disc < 0 || a < 1e-9) continue;
      const sq = Math.sqrt(disc);
      const t = c < 0 ? (-b + sq) / (2 * a) : (-b - sq) / (2 * a);
      if (t <= 0 || t >= bestT) continue;
      const px = o.x + dir.x * t;
      const py = o.y + dir.y * t;
      const pz = o.z + dir.z * t;
      const phi = Math.atan2(px, -pz);
      if (Math.abs(wrapPi(phi - s.theta)) > s.w / 2 / rad) continue;
      const drop = (1 - s.fade) * 0.4;
      if (py < BASE - drop || py > BASE + s.h - drop) continue;
      best = s;
      bestT = t;
    }
    return best;
  }

  private isOnAir(s: Slot) {
    return s.item === this.active && s.air > 0.5 && Math.abs(s.theta * this.R) < s.w / 2 + GAP;
  }

  private click(e: PointerEvent) {
    const s = this.hit(e.clientX, e.clientY);
    if (!s) return;
    if (this.isOnAir(s)) {
      this.openActive();
    } else {
      this.target = this.arc + this.wrapArc(s.at - this.arc);
      this.stiffness = 60;
    }
  }

  private updateCursor(x: number, y: number, fine: boolean) {
    const c = this.o.cursor;
    if (!fine) return;
    let air = false;
    let slot = -1;
    if (!this.drag?.moved) {
      const r = this.o.host.getBoundingClientRect();
      const s = this.hit(x + r.left, y + r.top);
      air = !!s && this.isOnAir(s);
      if (s && !air) slot = this.slots.indexOf(s);
    }
    this.hoverAir = air;
    this.hoverSlot = slot;
    this.o.host.style.cursor = air || slot >= 0 ? 'pointer' : this.drag?.moved ? 'grabbing' : 'grab';
    if (!c) return;
    c.dataset.show = 'true';
    c.dataset.kind = this.drag?.moved ? 'drag' : air ? 'play' : 'drag';
    c.dataset.over = air ? 'air' : slot >= 0 ? 'screen' : 'none';
    c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  private shownFraction() {
    const r = this.o.host.getBoundingClientRect();
    const vh = window.innerHeight;
    return (Math.min(r.bottom, vh) - Math.max(r.top, 0)) / Math.max(1, Math.min(r.height, vh));
  }

  private setCaptured(v: boolean) {
    if (this.captured === v) return;
    this.captured = v;
    if (!v) window.clearTimeout(this.idleTimer);
    this.flick = [];
    this.o.host.dataset.wheel = v ? 'captured' : 'free';
    this.cb.onWheelCapture?.(v);
  }

  private armIdle() {
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.setCaptured(false), IDLE_RELEASE_MS);
  }

  private onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || this.intro < 0.6 || this.n < 2) return;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1;
    let dx = e.deltaX * unit;
    let dy = e.deltaY * unit;
    // Shift+wheel on a plain mouse arrives as deltaY in some browsers.
    if (e.shiftKey && dx === 0) {
      dx = dy;
      dy = 0;
    }
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const delta = horizontal ? dx : dy;
    if (delta === 0) return;
    const now = performance.now();

    if (!horizontal) {
      if (!this.captured) {
        // The page scrolls; a pointer resting through a scroll is not a dwell.
        this.lastFreeWheel = now;
        window.clearTimeout(this.dwellTimer);
        this.dwellTimer = 0;
        return;
      }
      // Fast flick: hand the wheel back at once and let this event scroll the page.
      this.flick.push({ t: now, d: Math.abs(dy) });
      while (this.flick.length && now - this.flick[0].t > FLICK_WINDOW_MS) this.flick.shift();
      const burst = this.flick.reduce((t, f) => t + f.d, 0);
      const at = this.nearest(this.target ?? this.arc).item;
      const atEnd = (delta > 0 && at >= this.n - 1) || (delta < 0 && at <= 0);
      if (burst > FLICK_PX || Math.abs(dy) >= 300 || atEnd || this.shownFraction() < 0.82) {
        this.setCaptured(false);
        this.lastFreeWheel = now;
        return;
      }
      this.armIdle();
    }
    e.preventDefault();
    e.stopPropagation();
    if (now - this.wheelLast > 220) this.wheelAcc = 0;
    this.wheelLast = now;
    this.wheelAcc += delta;
    if (Math.abs(this.wheelAcc) >= 36 && now - this.wheelStepAt > 170) {
      const dir = this.wheelAcc > 0 ? 1 : -1;
      this.wheelAcc = 0;
      this.wheelStepAt = now;
      // A flat arc stops at its ends instead of wrapping.
      const at = this.nearest(this.target ?? this.arc).item;
      if (!this.loop && ((dir > 0 && at >= this.n - 1) || (dir < 0 && at <= 0))) return;
      // A horizontal spin does not by itself capture the vertical wheel.
      this.stepBy(dir);
    }
  };

  private onVisibility = () => {
    this.setVisible(this.visible);
  };

  private setVisible(v: boolean) {
    this.visible = v;
    const on = v && document.visibilityState === 'visible';
    if (this.video) {
      if (on) void this.video.play().catch(() => {});
      else this.video.pause();
    }
    if (!on && this.captured) this.setCaptured(false);
    if (on && !this.raf && !this.disposed && !this.failed && this.last) {
      this.last = performance.now();
      this.loop_();
    }
  }

  // ------------------------------------------------------------------ frame

  private loop_ = () => {
    this.raf = 0;
    if (this.disposed || this.failed) return;
    if (!this.visible || document.visibilityState !== 'visible') return;
    this.raf = requestAnimationFrame(this.loop_);
    const now = performance.now();
    const dtMs = now - this.last;
    const dt = Math.min(1 / 30, dtMs / 1000);
    this.last = now;
    this.frameNo++;
    this.measure(dtMs);
    this.update(dt, now / 1000);
    this.renderer.render(this.scene, this.camera);
    if (!this.readyFired) {
      this.readyFired = true;
      this.cb.onReady();
    }
  };

  private update(dt: number, time: number) {
    this.global.uTime.value = time;

    // Intro: ring spins in, screens fade up, camera settles.
    if (this.intro < 1) {
      this.intro = Math.min(1, this.intro + dt / 1.9);
      if (this.intro >= 1) this.stiffness = 70;
    }

    // Spring towards the target slot.
    if (!this.drag?.moved && this.target !== null) {
      const k = this.stiffness;
      const c = 2 * Math.sqrt(k) * 0.92;
      const a = k * (this.target - this.arc) - c * this.vel;
      this.vel += a * dt;
      this.arc += this.vel * dt;
      if (Math.abs(this.target - this.arc) < 1e-4 && Math.abs(this.vel) < 1e-3) {
        this.arc = this.target;
        this.vel = 0;
      }
    } else if (!this.drag) {
      this.vel = damp(this.vel, 0, 6, dt);
    }
    this.visVel = damp(this.visVel, clamp(this.vel / 6, -1, 1), 10, dt);
    this.global.uVel.value = this.visVel;

    // Which project is on air?
    const near = this.nearest(this.arc);
    if (near.item !== this.active) {
      this.active = near.item;
      this.settledFor = 0;
      if (this.videoFor !== near.item) this.stopPreview();
      this.ensurePosters(near.item);
      this.setTintTarget(near.item);
      this.cb.onActive(near.item);
    }
    const settled = !this.drag?.moved && Math.abs(this.vel) < 0.12 && Math.abs(near.arc - this.arc) < 0.05;
    const was = this.settledFor;
    this.settledFor = settled ? this.settledFor + dt : 0;
    if (was <= 0.14 && this.settledFor > 0.14 && this.intro > 0.7) this.sweep = 0;
    if (this.settledFor === 0) this.sweep = -1;
    if (this.sweep >= 0 && this.sweep < 1) this.sweep = Math.min(1, this.sweep + dt / 1.1);
    if (this.settledFor > 0.14 && this.intro > 0.7 && this.videoFor !== this.active && this.visible) {
      if (this.video) this.stopPreview();
      else this.startPreview(this.active);
    }
    this.updateVideo(dt);

    // Room tint eases toward the on-air project's colour.
    const tint = this.global.uTint.value;
    const tk = 1 - Math.exp(-2.4 * dt);
    tint.r += (this.tintTo.r - tint.r) * tk;
    tint.g += (this.tintTo.g - tint.g) * tk;
    tint.b += (this.tintTo.b - tint.b) * tk;

    // Camera framing (lerped so reels ↔ films morph), dolly, parallax and a slow breath.
    const fit = this.fitFor(this.active);
    const introDist = fit.dist * (1 + 0.55 * (1 - easeOutCubic(this.intro)));
    this.dolly = damp(this.dolly, this.dollyTo, this.dollyTo > this.dolly ? 5 : 3.5, dt);
    const dollyDist = Math.max(0.55, fit.dist * 0.32);
    const wantDist = introDist + (dollyDist - introDist) * easeOutCubic(this.dolly);
    this.dist = damp(this.dist, wantDist, 4.2, dt);
    this.lookY = damp(this.lookY, fit.lookY, 4.2, dt);
    this.parallax.x = damp(this.parallax.x, this.parallaxTo.x, 2.4, dt);
    this.parallax.y = damp(this.parallax.y, this.parallaxTo.y, 2.4, dt);
    const calm = 1 - this.dolly;
    const breathe = Math.sin(time * 0.35) * 0.025 * calm;
    const camZ = -this.R + this.dist;
    this.camera.position.set(this.parallax.x * 0.14 * calm + breathe, this.lookY + 0.1 - this.parallax.y * 0.07 * calm, camZ);
    this.camera.lookAt(this.parallax.x * 0.04 * calm, this.lookY, -this.R);
    this.global.uHaze.value.set(this.dist + 0.1, this.dist + 5);

    // Screens: base positions, then the on-air screen's growth pushes neighbours apart.
    const fadeT = easeOutCubic(this.intro);
    const grow: Array<{ d0: number; e: number }> = [];
    for (let k = 0; k < this.slots.length; k++) {
      const s = this.slots[k];
      const p = this.projects[s.item];
      const d0 = this.wrapArc(s.at - this.arc);
      s.d0 = d0;
      const isAir = s.item === this.active && Math.abs(d0) < p.off.w / 2 + GAP;
      s.air = damp(s.air, isAir ? 1 : 0, 7, dt);
      if (s.air < 1e-4) s.air = 0;
      const hov = k === this.hoverSlot && !isAir && !this.drag?.moved ? 1 : 0;
      s.hover = damp(s.hover, hov, 9, dt);
      const ea = easeInOut(s.air);
      s.w = lerp(p.off.w, p.on.w, ea) * (1 + 0.035 * s.hover);
      s.h = lerp(p.off.h, p.on.h, ea) * (1 + 0.035 * s.hover);
      const e = s.w - p.off.w;
      if (e > 1e-4) grow.push({ d0, e });
    }
    for (const s of this.slots) {
      let d = s.d0;
      for (const g of grow) {
        if (g.d0 === s.d0) continue;
        d += (g.e / 2) * Math.sign(s.d0 - g.d0);
      }
      const theta = d / this.R;
      s.theta = theta;
      const visible = Math.abs(theta) < 1.45;
      s.mesh.visible = visible;
      s.refl.visible = visible;
      s.label.visible = visible;
      if (!visible) continue;
      // Intro stagger: screens further round arrive later.
      const delay = Math.min(0.5, Math.abs(theta) * 0.45 * (this.loop ? 1 : 2.4));
      s.fade = clamp((fadeT - delay) / (1 - delay + 1e-3), 0, 1);
      const focus = Math.max(0, 1 - Math.abs(d) / 1.25) ** 1.6;
      // Screens round the sides of the ring sink into the dark so only the neighbours peek.
      const far = easeInOut(clamp((Math.abs(d) - 0.7) / 1.1, 0, 1));
      s.rad = this.R + PUSH * (1 - s.air) * calm - 0.1 * s.hover;
      if (far > 0) {
        s.w *= 1 - 0.14 * far;
        s.h *= 1 - 0.14 * far;
      }
      const isAirSlot = s.item === this.active && s.air > 0.5;
      for (const m of [s.mesh, s.refl]) {
        m.rotation.y = -theta;
        const u = m.material.uniforms;
        u.uDim.value.set(s.w, s.h);
        u.uRad.value = s.rad;
        u.uFocus.value = focus * (1 - this.dolly * (isAirSlot ? 0 : 0.9));
        u.uHover.value = s.hover;
        u.uFar.value = far;
        u.uAir.value = s.air;
        u.uFade.value = s.fade;
      }
      s.label.rotation.y = -theta;
      const lu = s.label.material.uniforms;
      lu.uAir.value = s.air;
      lu.uFade.value = s.fade;
      s.mesh.material.uniforms.uSweep.value = isAirSlot ? this.sweep : -1;
      if (isAirSlot) {
        this.airW = s.w;
        this.airH = s.h;
      }
    }
    this.fontReady.value = this.fontsOk ? Math.min(1, this.fontReady.value + dt / 0.4) : 0;

    // Floor ruler turns with the ring; beam, glow and dust follow the settle state.
    this.floorMat.uniforms.uArc.value = this.arc;
    this.floorMat.uniforms.uCam.value.copy(this.camera.position);
    const settleGlow = clamp(1 - Math.abs(this.vel) / 2.5, 0, 1) * fadeT;
    const vidOn = this.videoFor === this.active ? this.projects[this.active].shared.uVidMix.value : 0;
    this.glowMat.uniforms.uStrength.value = damp(this.glowMat.uniforms.uStrength.value as number, settleGlow * (0.7 + 0.3 * vidOn), 4, dt);
    this.beamMat.uniforms.uStrength.value = settleGlow * (1 - this.dolly);
    this.dustMat.uniforms.uStrength.value = settleGlow * (1 - this.dolly);
    this.glow.scale.set(0.45 + this.airW * 0.95, 0.6 + this.airH * 0.6, 1);
    this.glow.position.y = BASE + this.airH / 2;

    this.updateFrame();
  }

  /** Viewfinder brackets: the on-air screen's rectangle (as if exactly centred). */
  private updateFrame() {
    const el = this.o.frame;
    if (!el) return;
    const w = this.airW;
    const h = this.airH;
    const R = this.R;
    const half = w / R / 2;
    const yTop = BASE + h;
    const pts = [
      new Vector3(R * Math.sin(-half), BASE, -R * Math.cos(half)),
      new Vector3(R * Math.sin(half), yTop, -R * Math.cos(half)),
      new Vector3(0, BASE, -R),
      new Vector3(0, yTop, -R),
    ];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const v of pts) {
      v.project(this.camera);
      const sx = (v.x * 0.5 + 0.5) * this.width;
      const sy = (-v.y * 0.5 + 0.5) * this.height;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
      y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    const pad = 14;
    const fw = x1 - x0 + pad * 2;
    const fh = y1 - y0 + pad * 2;
    this.frameW = damp(this.frameW || fw, fw, 12, 1 / 60);
    this.frameH = damp(this.frameH || fh, fh, 12, 1 / 60);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    el.style.width = `${this.frameW.toFixed(1)}px`;
    el.style.height = `${this.frameH.toFixed(1)}px`;
    el.style.transform = `translate3d(${(cx - this.frameW / 2).toFixed(1)}px, ${(cy - this.frameH / 2).toFixed(1)}px, 0)`;
    el.style.opacity = String(clamp(this.intro * 2 - 1, 0, 1) * (1 - this.dolly));
    el.dataset.hot = this.hoverAir ? 'true' : 'false';
  }
}
