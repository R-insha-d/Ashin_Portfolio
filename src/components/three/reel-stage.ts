import {
  AgXToneMapping,
  type BufferGeometry,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineSegments,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Plane,
  Scene,
  SRGBColorSpace,
  Vector3,
  type WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { EASE } from '@/lib/motion';
import { REEL } from '@/lib/reel-art';
import { FpsMonitor } from './fps-monitor';
import { createFilmTexture } from './reel-film-texture';
import {
  createFlangeGeometry,
  createHaloGeometry,
  createHubGeometry,
  createPackGeometry,
  createRibbonGeometry,
  createTallyGeometry,
} from './reel-geometry';
import { createReelMaterials, type ReelMaterials } from './reel-materials';
import { bakeStudioEnvironment } from './studio-env';

import type { ReelCommand, ReelMode } from './reel-store';

export type ReelFailure = 'unavailable' | 'fallback';

export interface ReelStageCallbacks {
  onReady: () => void;
  onFail: (reason: ReelFailure) => void;
  onModeChange: (mode: ReelMode, playing: boolean) => void;
  onFrame: (frame: number) => void;
}

export interface ReelStageOptions {
  canvas: HTMLCanvasElement;
  /** The monitor picture: resize source and pointer target. */
  picture: HTMLElement;
  coarse: boolean;
  /** (hover: hover) and (pointer: fine): enables tilt. */
  fine: boolean;
  /** Motion on (not Standby, not reduced motion) at start. */
  motionOn: boolean;
}

const TAU = Math.PI * 2;
const PLAY_SPEED = 0.63; // rad/s
const JOG_RAD_PER_PX = 0.011;
const FRAMES_PER_TURN = 25;
const SHUTTLE_MIN = 6; // rad/s
const INERTIA_DECAY = 3;
const SWEEP_FROM = -1.6;
const SWEEP_TO = 1.6;
const SWEEP_S = 1.6;
const RACK_S = 1.2;
const TILT = { x: 0.1, y: 0.16, lambda: 4 };
const AXIS_LOCK_PX = 8;
const PARKED = 1e3; // a clip constant that keeps everything visible after the sweep

/** CSS-style cubic-bezier easing (x → y), solved with a few Newton steps. */
function bezier([x1, y1, x2, y2]: readonly [number, number, number, number]): (t: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sy(MathUtils.clamp(t, 0, 1));
  };
}
const easeSweep = bezier(EASE.sweep);
const easeTrim = bezier(EASE.trim);

/**
 * The film reel, in plain three (S1.5–S1.8). Owns the renderer, scene, render loop,
 * pointer jog/tilt and FPS watchdog. React only creates it, forwards commands and disposes it.
 */
export class ReelStage {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly lift = new Group();
  private readonly reel = new Group();
  private readonly spin = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private materials: ReelMaterials | null = null;
  private env: WebGLRenderTarget | null = null;
  private filmAtlasLength = 1;
  private filmTexture: ReturnType<typeof createFilmTexture>['texture'] | null = null;
  private edges: LineSegments[] = [];
  private renderPlane: Plane | null = null;
  private edgePlane: Plane | null = null;
  private readonly fps: FpsMonitor;
  private readonly ro: ResizeObserver;
  private readonly io: IntersectionObserver;
  private readonly cleanups: Array<() => void> = [];
  private dprCap: number;

  // Lifecycle / loop
  private disposed = false;
  private live = false;
  private failed = false;
  private inView = true;
  private visible = typeof document === 'undefined' ? true : document.visibilityState !== 'hidden';
  private raf = 0;
  private last = -1;
  private continuous = false;

  // Animation state
  private motionOn: boolean;
  private playing: boolean;
  private mode: ReelMode;
  private theta = 0; // spin angle; positive = clockwise as seen by the camera
  private frame = 0; // reel timecode, in frames (float)
  private lastEmittedFrame = -1;
  private stepRemaining = 0; // rad still to travel for frame steps
  private omega = 0; // rad/s, inertia after a jog
  private inertia = false;
  private resumePlaying = false;
  private sweepT = -1; // seconds into the sweep, −1 when not sweeping
  private rackT = -1; // seconds into the rack, −1 when not racking
  private rack = 0; // 0 = start pose, 1 = rest pose
  private tiltTarget = { x: 0, y: 0 };
  private tilt = { x: 0, y: 0 };
  private scroll = 0;
  private clock = 0;

  // Pointer
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastMoveT = 0;
  private locked: 'none' | 'x' | 'y' = 'none';

  constructor(
    private readonly opts: ReelStageOptions,
    private readonly cb: ReelStageCallbacks,
  ) {
    const { canvas, coarse, motionOn } = opts;
    this.motionOn = motionOn;
    this.playing = motionOn;
    this.mode = motionOn ? 'play' : 'pause';
    this.dprCap = coarse ? 1.5 : 1.75;

    this.renderer = new WebGLRenderer({
      canvas, alpha: true, antialias: true, stencil: false, powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = AgXToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));

    const [cx, cy, cz] = REEL.camera.position;
    this.camera = new PerspectiveCamera(REEL.camera.fov, 4 / 3, REEL.camera.near, REEL.camera.far);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 0, 0);

    this.fps = new FpsMonitor({
      onDegrade: () => { this.dprCap = 1; this.renderer.setPixelRatio(1); this.resize(); },
      onGiveUp: () => this.fail('fallback'),
    });

    const onLost = (e: Event) => { e.preventDefault(); this.fail('unavailable'); };
    canvas.addEventListener('webglcontextlost', onLost);
    this.cleanups.push(() => canvas.removeEventListener('webglcontextlost', onLost));

    this.ro = new ResizeObserver(() => { this.resize(); this.requestRender(); });
    this.io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        this.inView = !!e?.isIntersecting;
        if (this.inView) this.requestRender(); else this.stopLoop();
      },
      { threshold: 0.1 },
    );
    const onVis = () => {
      this.visible = document.visibilityState !== 'hidden';
      if (this.visible) this.requestRender(); else this.stopLoop();
    };
    document.addEventListener('visibilitychange', onVis);
    this.cleanups.push(() => document.removeEventListener('visibilitychange', onVis));
  }

  /** Build, compile, render the first frame, then report ready. Rejects only on unexpected errors. */
  async start(): Promise<void> {
    const { coarse, picture } = this.opts;
    this.env = bakeStudioEnvironment(this.renderer, coarse);
    this.scene.environment = this.env.texture;
    const key = new DirectionalLight(0xfff4e6, 0.95);
    key.position.set(-2, 3, 4);
    this.scene.add(key);

    const film = createFilmTexture(coarse);
    this.filmTexture = film.texture;
    const mats = createReelMaterials(coarse, film.texture);
    this.materials = mats;

    const flangeGeo = createFlangeGeometry(coarse);
    const packGeo = createPackGeometry();
    const hubGeo = createHubGeometry();
    const tallyGeo = createTallyGeometry();
    const ribbon = createRibbonGeometry(coarse);
    const haloGeo = createHaloGeometry();
    this.filmAtlasLength = ribbon.atlasLength;
    this.geometries.push(flangeGeo, packGeo, hubGeo, tallyGeo, ribbon.geometry, haloGeo);

    const flange = new Mesh(flangeGeo, mats.flange);
    const pack = new Mesh(packGeo, mats.pack);
    const hub = new Mesh(hubGeo, mats.hub);
    const tally = new Mesh(tallyGeo, mats.tally);
    const ribbonMesh = new Mesh(ribbon.geometry, mats.film);
    const halo = new Mesh(haloGeo, mats.halo);
    halo.position.set(0.18, -0.12, -0.9);
    halo.renderOrder = -1;

    this.spin.add(flange, pack, hub, tally);
    this.reel.add(this.spin, ribbonMesh);
    this.lift.add(halo, this.reel);
    this.scene.add(this.lift);

    const sweep = this.motionOn;
    if (sweep) {
      this.renderer.localClippingEnabled = true;
      this.renderPlane = new Plane(new Vector3(0, -1, 0), SWEEP_FROM);
      this.edgePlane = new Plane(new Vector3(0, 1, 0), -SWEEP_FROM);
      for (const m of [mats.flange, mats.pack, mats.hub, mats.tally, mats.film]) m.clippingPlanes = [this.renderPlane];
      mats.edge.clippingPlanes = [this.edgePlane];
      for (const mesh of [flange, pack, hub, tally, ribbonMesh]) {
        const eg = new EdgesGeometry(mesh.geometry, 25);
        this.geometries.push(eg);
        const lines = new LineSegments(eg, mats.edge);
        mesh.add(lines);
        this.edges.push(lines);
      }
      this.sweepT = 0;
    } else {
      this.rack = 1;
    }
    this.applyPose();

    this.resize();
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch (err) {
      if (this.disposed || this.failed) return;
      throw err;
    }
    if (this.disposed || this.failed) return;

    // Redraw the edge print once the site's mono font is in (never blocks first frame).
    void film.ready.then(() => this.requestRender());

    this.ro.observe(picture);
    this.io.observe(picture);
    this.bindPointer();
    this.renderer.render(this.scene, this.camera);
    this.live = true;
    this.cb.onReady();
    this.emitMode();
    this.emitFrame(true);
    this.requestRender();
  }

  // ---------------------------------------------------------------- public API

  command(cmd: ReelCommand): void {
    if (!this.live) return;
    if (cmd.type === 'step') {
      const step = cmd.delta;
      this.stopInertia();
      this.playing = false;
      this.setMode('pause');
      this.frame = Math.max(0, Math.round(this.frame) + step);
      if (this.motionOn) this.stepRemaining += (step * TAU) / FRAMES_PER_TURN;
      else this.advance((step * TAU) / FRAMES_PER_TURN);
      this.emitFrame();
    } else if (cmd.type === 'toggle') {
      this.setPlaying(!this.playing);
    } else if (cmd.type === 'play') {
      this.setPlaying(true);
    } else {
      this.setPlaying(false);
    }
    this.requestRender();
  }

  /** Motion preference (Rec chip / reduced motion). Pausing motion stops everything automatic. */
  setMotion(on: boolean): void {
    if (on === this.motionOn) return;
    this.motionOn = on;
    if (!on) {
      this.stopInertia();
      this.sweepT = -1;
      this.finishSweep();
      this.rackT = -1;
      this.rack = 1;
      this.tiltTarget = { x: 0, y: 0 };
      this.tilt = { x: 0, y: 0 };
      this.advance(this.stepRemaining);
      this.stepRemaining = 0;
    }
    this.setPlaying(on);
    this.applyPose();
    this.requestRender();
  }

  /** Hero scroll progress 0–1 (dolly and lift). Ignored while motion is paused. */
  setScroll(p: number): void {
    this.scroll = MathUtils.clamp(p, 0, 1);
    this.applyPose();
    this.requestRender();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.live = false;
    this.stopLoop();
    this.ro.disconnect();
    this.io.disconnect();
    for (const c of this.cleanups) c();
    for (const g of this.geometries) g.dispose();
    if (this.materials) for (const m of this.materials.all) m.dispose();
    this.filmTexture?.dispose();
    this.env?.dispose();
    this.scene.environment = null;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  // ---------------------------------------------------------------- state

  private fail(reason: ReelFailure): void {
    if (this.failed || this.disposed) return;
    this.failed = true;
    this.live = false;
    this.stopLoop();
    this.cb.onFail(reason);
  }

  private setPlaying(next: boolean): void {
    if (next) this.stopInertia();
    this.playing = next;
    this.setMode(next ? 'play' : 'pause');
  }

  private setMode(mode: ReelMode): void {
    if (mode === this.mode) { this.emitMode(); return; }
    this.mode = mode;
    this.emitMode();
  }

  private lastModeKey = '';
  private emitMode(): void {
    const k = `${this.mode}:${this.playing}`;
    if (k === this.lastModeKey) return;
    this.lastModeKey = k;
    this.cb.onModeChange(this.mode, this.playing);
  }

  private emitFrame(force = false): void {
    const f = Math.max(0, Math.floor(this.frame + 1e-6));
    if (!force && f === this.lastEmittedFrame) return;
    this.lastEmittedFrame = f;
    this.cb.onFrame(f);
  }

  private stopInertia(): void {
    if (!this.inertia) return;
    this.inertia = false;
    this.omega = 0;
  }

  /** Rotate the reel by dθ and run the film with it (film speed = ω × pack radius). */
  private advance(dTheta: number): void {
    this.theta += dTheta;
    this.spin.rotation.z = -this.theta;
    if (this.filmTexture) {
      this.filmTexture.offset.x -= (dTheta * REEL.pack.radius) / this.filmAtlasLength;
      this.filmTexture.offset.x %= 1;
    }
  }

  private applyPose(): void {
    const scroll = this.motionOn ? this.scroll : 0;
    const r = easeTrim(this.rack);
    this.reel.rotation.x = REEL.restPose.rotationX * r + this.tilt.x;
    this.reel.rotation.y = REEL.restPose.rotationY * r + this.tilt.y;
    this.lift.position.y = 0.5 * scroll;
    this.camera.position.z = REEL.camera.position[2] + 1.2 * scroll;
  }

  private finishSweep(): void {
    if (!this.materials) return;
    for (const l of this.edges) { l.removeFromParent(); }
    this.edges = [];
    // Park the planes instead of removing them: same shader program, so no recompile hitch.
    if (this.renderPlane) this.renderPlane.constant = PARKED;
    if (this.edgePlane) this.edgePlane.constant = -PARKED;
    this.materials.halo.opacity = 0.28;
  }

  private animating(): boolean {
    const tiltMoving =
      Math.abs(this.tilt.x - this.tiltTarget.x) > 1e-4 || Math.abs(this.tilt.y - this.tiltTarget.y) > 1e-4;
    return (
      this.playing ||
      this.inertia ||
      this.sweepT >= 0 ||
      this.rackT >= 0 ||
      Math.abs(this.stepRemaining) > 1e-4 ||
      tiltMoving
    );
  }

  // ---------------------------------------------------------------- loop

  private canRun(): boolean {
    return this.live && !this.disposed && !this.failed && this.inView && this.visible;
  }

  /** Render once now-ish; the loop keeps going only while something animates. */
  requestRender(): void {
    if (this.raf || !this.canRun()) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = -1;
    this.continuous = false;
    this.fps.reset();
  }

  private readonly tick = (now: number): void => {
    this.raf = 0;
    if (!this.canRun()) { this.stopLoop(); return; }
    const dt = this.last < 0 ? 1 / 60 : Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.animating()) {
      if (this.continuous) this.fps.tick(now);
      this.continuous = true;
      if (!this.failed) this.raf = requestAnimationFrame(this.tick);
    } else {
      this.last = -1;
      this.continuous = false;
      this.fps.reset();
    }
  };

  private update(dt: number): void {
    this.clock += dt;
    // Sweep → rack.
    if (this.sweepT >= 0) {
      this.sweepT += dt;
      const k = Math.min(this.sweepT / SWEEP_S, 1);
      const h = MathUtils.lerp(SWEEP_FROM, SWEEP_TO, easeSweep(k));
      if (this.renderPlane) this.renderPlane.constant = h;
      if (this.edgePlane) this.edgePlane.constant = -h;
      if (this.materials) this.materials.halo.opacity = 0.28 * easeSweep(k);
      if (k >= 1) { this.sweepT = -1; this.finishSweep(); this.rackT = 0; }
    } else if (this.rackT >= 0) {
      this.rackT += dt;
      this.rack = Math.min(this.rackT / RACK_S, 1);
      if (this.rack >= 1) this.rackT = -1;
    }

    // Spin sources.
    if (this.playing && this.pointerId === null) {
      this.advance(PLAY_SPEED * dt);
      this.frame += FRAMES_PER_TURN * dt;
    }
    if (this.inertia) {
      const before = this.omega;
      this.omega *= Math.exp(-INERTIA_DECAY * dt);
      const d = ((before + this.omega) / 2) * dt;
      this.advance(d);
      this.frame = Math.max(0, this.frame + (d * FRAMES_PER_TURN) / TAU);
      if (Math.abs(this.omega) < SHUTTLE_MIN && this.mode === 'shuttle') this.setMode('jog');
      if (Math.abs(this.omega) < 0.05) {
        this.inertia = false;
        this.omega = 0;
        this.playing = this.resumePlaying && this.motionOn;
        this.setMode(this.playing ? 'play' : 'pause');
      }
    }
    if (Math.abs(this.stepRemaining) > 1e-4) {
      const next = MathUtils.damp(this.stepRemaining, 0, 14, dt);
      const d = Math.abs(next) < 1e-4 ? this.stepRemaining : this.stepRemaining - next;
      this.advance(d);
      this.stepRemaining -= d;
    }

    // Tilt (damped toward the pointer).
    this.tilt.x = MathUtils.damp(this.tilt.x, this.tiltTarget.x, TILT.lambda, dt);
    this.tilt.y = MathUtils.damp(this.tilt.y, this.tiltTarget.y, TILT.lambda, dt);

    // Tally ring breathes at 0.6 Hz while playing.
    if (this.materials) {
      this.materials.tally.opacity =
        this.playing && this.motionOn ? 0.8 + 0.2 * Math.sin(this.clock * TAU * 0.6) : 1;
    }

    this.applyPose();
    this.emitFrame();
  }

  private resize(): void {
    const el = this.opts.picture;
    const w = Math.max(1, Math.round(el.clientWidth));
    const h = Math.max(1, Math.round(el.clientHeight));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.dprCap));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Keep the reel framed on tall or narrow pictures: widen the vertical fov when narrower than 4:3.
    const base = REEL.camera.fov;
    this.camera.fov = this.camera.aspect < 4 / 3
      ? MathUtils.radToDeg(2 * Math.atan((Math.tan(MathUtils.degToRad(base / 2)) * (4 / 3)) / this.camera.aspect))
      : base;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- pointer

  private bindPointer(): void {
    const el = this.opts.picture;
    el.style.touchAction = 'pan-y';
    el.style.cursor = 'grab';
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(type, fn as EventListener);
      this.cleanups.push(() => el.removeEventListener(type, fn as EventListener));
    };
    this.cleanups.push(() => { el.style.cursor = ''; el.style.touchAction = ''; });

    on('pointerdown', (e) => {
      if (!this.live || this.pointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest('button, a, input, [role="button"]')) return;
      this.pointerId = e.pointerId;
      this.startX = this.lastX = e.clientX;
      this.startY = e.clientY;
      this.lastMoveT = e.timeStamp;
      this.locked = e.pointerType === 'touch' ? 'none' : 'x';
      if (this.locked === 'x') this.beginJog(e);
    });

    on('pointermove', (e) => {
      if (this.pointerId === null) {
        // Hover tilt: fine pointers only, motion on.
        if (e.pointerType === 'mouse' && this.opts.fine && this.motionOn && this.live) {
          const r = el.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          this.tiltTarget = { x: MathUtils.clamp(ny, -1, 1) * TILT.x, y: MathUtils.clamp(nx, -1, 1) * TILT.y };
          this.requestRender();
        }
        return;
      }
      if (e.pointerId !== this.pointerId) return;
      if (this.locked === 'none') {
        const dx = e.clientX - this.startX, dy = e.clientY - this.startY;
        if (Math.abs(dy) > AXIS_LOCK_PX && Math.abs(dy) >= Math.abs(dx)) { this.releasePointer(); return; }
        if (Math.abs(dx) > AXIS_LOCK_PX && Math.abs(dx) > Math.abs(dy)) { this.locked = 'x'; this.beginJog(e); }
        else return;
      }
      if (this.locked !== 'x') return;
      e.preventDefault();
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      const dTheta = dx * JOG_RAD_PER_PX;
      const dtMs = Math.max(1, e.timeStamp - this.lastMoveT);
      this.lastMoveT = e.timeStamp;
      const inst = (dTheta / dtMs) * 1000;
      this.omega = MathUtils.lerp(this.omega, inst, 0.5);
      this.advance(dTheta);
      this.frame = Math.max(0, this.frame + (dTheta * FRAMES_PER_TURN) / TAU);
      this.emitFrame();
      this.renderOnce();
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const jogging = this.locked === 'x';
      // A long hold before release means no fling.
      if (e.timeStamp - this.lastMoveT > 80) this.omega = 0;
      this.releasePointer();
      if (!jogging) return;
      el.style.cursor = 'grab';
      if (this.motionOn && Math.abs(this.omega) > 0.05) {
        this.inertia = true;
        this.setMode(Math.abs(this.omega) > SHUTTLE_MIN ? 'shuttle' : 'jog');
      } else {
        this.omega = 0;
        this.playing = this.resumePlaying && this.motionOn;
        this.setMode(this.playing ? 'play' : 'pause');
      }
      this.requestRender();
    };
    on('pointerup', end);
    on('pointercancel', end);
    on('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.pointerId === null) {
        this.tiltTarget = { x: 0, y: 0 };
        this.requestRender();
      }
    });
  }

  private beginJog(e: PointerEvent): void {
    const el = this.opts.picture;
    try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    el.style.cursor = 'grabbing';
    if (!this.inertia) this.resumePlaying = this.playing;
    this.stopInertia();
    this.omega = 0;
    this.playing = false;
    this.tiltTarget = { x: 0, y: 0 };
    this.setMode('jog');
  }

  private releasePointer(): void {
    const el = this.opts.picture;
    if (this.pointerId !== null) {
      try { if (el.hasPointerCapture(this.pointerId)) el.releasePointerCapture(this.pointerId); } catch { /* ignore */ }
    }
    this.pointerId = null;
    this.locked = 'none';
  }

  /** On-demand render for input while the loop is idle. */
  private renderOnce(): void {
    if (this.raf) return;
    if (!this.canRun()) return;
    this.applyPose();
    this.renderer.render(this.scene, this.camera);
  }
}
