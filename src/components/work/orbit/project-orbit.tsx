'use client';

import Image from 'next/image';
import { ArrowDown, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RecDot } from '@/components/ui/rec-dot';
import { afterPreloader, probeWebGL2 } from '@/components/three/load-policy';
import { profile } from '@/content/profile';
import { sortCategories } from '@/lib/categories';
import { getLenis } from '@/lib/smooth-scroll';
import { cn } from '@/lib/cn';
import { useMotionPaused } from '@/lib/motion-pref';
import { formatTimecode, FPS } from '@/lib/timecode';
import type { GalleryProject } from '../project-card';
import { ProjectPlayer } from '../project-player';
import { OrbitRail } from './orbit-rail';
import { aspectOf, OB_LABELS, OB_LAYOUT, pad2, posterOf, projectLabel, screenDims, texturePoster } from './orbit-shared';
import type { OrbitItem, OrbitStage } from './orbit-stage';
import './orbit.css';

const L = profile.copy.projectsPage.labels;
const w = profile.copy.work;

type GlState = 'idle' | 'loading' | 'ready' | 'failed';

const noopSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** Screen sizes for the loading still: the same layout as the stage (orbit-shared, no three import). */
const dimsFor = (aspect: number, onAir: boolean) => (onAir ? screenDims(aspect).on : screenDims(aspect).off);
const GAP = OB_LAYOUT.gap;

/**
 * ORBIT: the Projects gallery as a ring of curved video panels around the camera (three.js).
 * Drag, wheel (only while the stage is on screen, released at the first and last project),
 * arrow buttons or the reel index spin it; the panel facing the camera is on air and plays its
 * muted preview. Selecting it dollies the camera in and opens ProjectPlayer with sound.
 * Motion paused or no WebGL: the calm film-strip rail (orbit-rail.tsx) instead.
 */
export function ProjectOrbit({ projects }: { projects: readonly GalleryProject[] }) {
  const paused = useMotionPaused();
  const hydrated = useHydrated();
  const n = projects.length;
  const [gl, setGl] = useState<GlState>('idle');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [phGone, setPhGone] = useState(false);
  /** True while the stage is using the vertical wheel to spin (the visitor engaged it). */
  const [wheelCaptured, setWheelCaptured] = useState(false);
  const jumpNote = useRef<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLOListElement>(null);
  const orbitRef = useRef<OrbitStage | null>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const pointerPick = useRef<{ index: number; wasActive: boolean } | null>(null);
  const lastOpen = useRef<number | null>(null);

  const mode: 'orbit' | 'rail' = paused || gl === 'failed' ? 'rail' : 'orbit';
  const project = projects[active] ?? projects[0];

  const categories = useMemo(() => sortCategories([...new Set(projects.map((p) => p.category))]), [projects]);

  // ------------------------------------------------------------------ WebGL lifecycle
  useEffect(() => {
    if (mode !== 'orbit' || n === 0) return;
    const host = stageRef.current;
    const canvasHost = canvasHostRef.current;
    if (!host || !canvasHost) return;
    let cancelled = false;
    let stage: OrbitStage | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let raf1 = 0;
    let raf2 = 0;

    const boot = async () => {
      if (cancelled) return;
      if (!probeWebGL2()) {
        setGl('failed');
        return;
      }
      setGl('loading');
      try {
        const mod = await import('./orbit-stage');
        if (cancelled) return;
        const small = window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;
        const items: OrbitItem[] = projects.map((p) => {
          const ar = aspectOf(p);
          const poster = posterOf(p);
          return {
            id: p.id,
            aspect: ar,
            poster: poster ? texturePoster(poster, ar > 1 ? (small ? 640 : 1080) : small ? 384 : 640) : null,
            preview: p.video?.preview ?? null,
          };
        });
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.tabIndex = -1;
        canvasHost.appendChild(canvas);
        const saveData = document.documentElement.dataset.saveData === 'true';
        stage = new mod.OrbitStage(
          {
            canvas,
            host,
            frame: frameRef.current,
            cursor: cursorRef.current,
            items,
            labelFont: getComputedStyle(tcRef.current ?? document.body).fontFamily || 'monospace',
            start: 0,
            coarse: window.matchMedia('(pointer: coarse)').matches,
            previews: !saveData,
          },
          {
            onReady: () => { if (!cancelled) setGl('ready'); },
            onFail: () => { if (!cancelled) setGl('failed'); },
            onActive: (i) => { if (!cancelled) setActive(i); },
            onOpen: (i) => {
              window.clearTimeout(openTimer.current);
              openTimer.current = window.setTimeout(() => { if (!cancelled) { lastOpen.current = i; setOpen(i); } }, 380);
            },
            onTime: (s) => {
              const el = tcRef.current;
              if (el) el.textContent = formatTimecode(s === null ? 0 : s * FPS);
            },
            onWheelCapture: (captured) => { if (!cancelled) setWheelCaptured(captured); },
          },
        );
        orbitRef.current = stage;
        await stage.start();
      } catch {
        if (!cancelled) setGl('failed');
      }
    };

    const off = afterPreloader(() => {
      // After first paint: the poster still is on screen before any three.js work begins.
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => void boot()); });
    });
    return () => {
      cancelled = true;
      off();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(openTimer.current);
      stage?.dispose();
      canvas?.remove();
      orbitRef.current = null;
      setGl((g) => (g === 'failed' ? g : 'idle'));
      setPhGone(false);
    };
  }, [mode, n, projects]);

  // Unmount the placeholder still after the canvas has faded in.
  useEffect(() => {
    if (gl !== 'ready') return;
    const t = window.setTimeout(() => setPhGone(true), 1000);
    return () => window.clearTimeout(t);
  }, [gl]);

  // Keep the active thumbnail in view inside the index strip (never scrolls the page).
  useEffect(() => {
    const list = stripRef.current;
    const btn = list?.querySelector<HTMLElement>(`[data-i="${active}"]`);
    if (!list || !btn) return;
    const l = btn.offsetLeft - list.clientWidth / 2 + btn.offsetWidth / 2;
    list.scrollTo({ left: Math.max(0, l), behavior: paused ? 'auto' : 'smooth' });
  }, [active, paused]);

  // ------------------------------------------------------------------ actions
  const select = useCallback((i: number) => {
    setActive(i);
    orbitRef.current?.goTo(i);
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      const s = orbitRef.current;
      if (s) s.step(dir);
      else setActive((a) => (a + dir + n) % n);
    },
    [n],
  );

  const play = useCallback(
    (i: number) => {
      const s = orbitRef.current;
      if (s && gl === 'ready') {
        s.goTo(i);
        s.openActive();
        // openActive() uses the stage's on-air index; make sure it is the requested one.
        window.clearTimeout(openTimer.current);
        openTimer.current = window.setTimeout(() => { lastOpen.current = i; setOpen(i); }, 380);
      } else {
        lastOpen.current = i;
        setOpen(i);
      }
    },
    [gl],
  );

  const onPlayerChange = (index: number | null) => {
    if (index !== null) {
      lastOpen.current = index;
      setActive(index);
      orbitRef.current?.goTo(index);
    }
    setOpen(index);
    if (index === null) {
      orbitRef.current?.setDolly(false);
      const back = lastOpen.current;
      window.setTimeout(() => {
        const sel = mode === 'orbit' ? `[data-i="${back}"]` : `[data-rail-i="${back}"]`;
        document.querySelector<HTMLElement>(`#ob-root ${sel}`)?.focus({ preventScroll: true });
      }, 0);
    }
  };

  const jump = (c: string) => {
    const inCat = projects.map((p, i) => (p.category === c ? i : -1)).filter((i) => i >= 0);
    if (inCat.length === 0) return;
    const cur = inCat.indexOf(active);
    const k = cur === -1 ? 0 : (cur + 1) % inCat.length;
    jumpNote.current = `${OB_LABELS.jumped} ${c}, ${k + 1} ${OB_LABELS.of} ${inCat.length}`;
    select(inCat[k]);
  };

  /** Hands the wheel back to the page and scrolls just past the stage. */
  const continueScroll = () => {
    orbitRef.current?.releaseWheel();
    setWheelCaptured(false);
    const stage = stageRef.current;
    if (!stage) return;
    const target = stage.getBoundingClientRect().bottom + window.scrollY - 80;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target);
    else window.scrollTo({ top: target, behavior: paused ? 'auto' : 'smooth' });
  };

  // Polite status for screen readers when the on-air project settles.
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (mode !== 'orbit' || !project) return;
    const t = window.setTimeout(() => {
      const lead = jumpNote.current ? `${jumpNote.current}. ` : '';
      jumpNote.current = null;
      setStatus(`${lead}${OB_LABELS.onAir}: ${pad2(active + 1)} / ${pad2(n)}, ${project.title}, ${project.category}${project.video?.duration ? `, ${project.video.duration}` : ''}`);
    }, 500);
    return () => window.clearTimeout(t);
  }, [active, mode, n, project]);

  if (n === 0) return <p className="mx-auto max-w-wide px-(--gutter) text-body text-smoke">{profile.copy.projectsPage.empty}</p>;

  const ar = aspectOf(project);
  const showOrbit = !hydrated || mode === 'orbit';
  const showRail = !hydrated || mode === 'rail';

  return (
    <div id="ob-root">
      {showOrbit ? (
        <div className={cn('flex flex-col', !hydrated && 'stby:hidden')}>
          {/* ------------------------------------------------ the stage */}
          <div
            ref={stageRef}
            className="ob-stage"
            role="region"
            aria-roledescription="carousel"
            aria-label={OB_LABELS.stage}
          >
            {/* Loading still: a CSS version of the ring, so the first paint is already the scene. */}
            {!phGone ? <Placeholder projects={projects} active={active} ready={gl === 'ready'} /> : null}
            <div ref={canvasHostRef} className="ob-canvas" data-ready={gl === 'ready'} />

            <div aria-hidden="true" className="ob-scrim" />
            <div aria-hidden="true" className="ob-grain" />

            <div ref={frameRef} aria-hidden="true" className="ob-frame">
              <span className="corner-brackets absolute inset-0" />
              <span className="ob-frame-tag micro-caps flex items-center gap-1.5 whitespace-nowrap text-amber">
                <span className="inline-block size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-amber" />
                {L.playWithSound}
              </span>
            </div>
            <div ref={cursorRef} aria-hidden="true" className="ob-cursor micro-caps" data-show="false" data-kind="drag">
              <span>
                <span className="ob-k-drag">← {OB_LABELS.drag} →</span>
                <span className="ob-k-play">▶ {OB_LABELS.play}</span>
              </span>
            </div>

            {/* Top HUD */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-3 mx-auto flex max-w-wide items-start justify-between gap-4 px-(--gutter) pt-4 md:pt-5">
              <p className="micro-caps flex items-center gap-2.5 text-paper">
                <RecDot />
                <span>{OB_LABELS.onAir}</span>
                <span aria-hidden="true" className="h-3 w-px bg-rule" />
                <span className="text-ash">{OB_LABELS.cam}</span>
                <span aria-hidden="true" className="h-3 w-px bg-rule" />
                <span className="tc text-paper" aria-hidden="true">
                  {pad2(active + 1)} <span className="text-ash">/ {pad2(n)}</span>
                </span>
              </p>
              <p className="flex flex-col items-end gap-1.5 text-right" aria-hidden="true">
                <span ref={tcRef} className="tc text-paper">00:00:00:00</span>
                <span className="micro-caps hidden text-ash sm:inline">{OB_LABELS.muted}</span>
                <span className="micro-caps text-ash sm:hidden">{OB_LABELS.hintTouch}</span>
              </p>
            </div>

            {/* Side arrows (tablet and up) */}
            {n > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={w.previous}
                  className="absolute left-(--gutter) top-1/2 z-3 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-edge bg-void/50 text-paper backdrop-blur-sm transition-colors hover:border-amber hover:text-amber md:inline-flex"
                >
                  <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={w.next}
                  className="absolute right-(--gutter) top-1/2 z-3 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-edge bg-void/50 text-paper backdrop-blur-sm transition-colors hover:border-amber hover:text-amber md:inline-flex"
                >
                  <ChevronRight size={22} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </>
            ) : null}

            {/* Bottom HUD */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-3 mx-auto flex max-w-wide flex-col gap-3 px-(--gutter) pb-4 md:flex-row md:items-end md:justify-between md:gap-4 md:pb-6">
              <div className="flex min-w-0 items-end gap-3 md:gap-5" aria-hidden="true">
                <span key={`n-${active}`} className="ob-num ob-swap">{pad2(active + 1)}</span>
                <span key={`m-${active}`} className="ob-swap flex min-w-0 flex-col gap-1.5 pb-1 [animation-delay:60ms]">
                  <CategoryTitle text={project.category} />
                  <span className="micro-caps text-ash">
                    {ar > 1 ? L.film : L.reel}
                    <span className="mx-1.5">·</span>
                    {ar > 1 ? '16:9' : '9:16'}
                    {project.video?.duration ? (
                      <>
                        <span className="mx-1.5">·</span>
                        <span className="tc text-paper">{project.video.duration}</span>
                      </>
                    ) : null}
                  </span>
                  {n > 1 ? (
                    <span className="micro-caps hidden text-ash md:inline">
                      {OB_LABELS.upNext} <span className="tc text-paper">{pad2(((active + 1) % n) + 1)}</span>
                      <span className="mx-1.5">·</span>
                      {projects[(active + 1) % n].category}
                    </span>
                  ) : null}
                </span>
              </div>

              {wheelCaptured ? (
                // The wheel is spinning the reel: an explicit way out to the rest of the page.
                <button
                  type="button"
                  onClick={continueScroll}
                  className="micro-caps pointer-events-auto absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-pill border border-edge bg-void/70 px-4 py-2 text-paper backdrop-blur-sm transition-colors hover:border-amber hover:text-amber md:inline-flex"
                >
                  {OB_LABELS.continue}
                  <ArrowDown size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              ) : (
                <p className="micro-caps pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-ash xl:block" aria-hidden="true">
                  {OB_LABELS.hint}
                </p>
              )}

              <div className="pointer-events-auto flex items-center gap-2 md:shrink-0">
                {n > 1 ? (
                  <button type="button" onClick={() => step(-1)} aria-label={w.previous} className="inline-flex size-11 items-center justify-center rounded-full border border-edge bg-void/50 text-paper backdrop-blur-sm md:hidden">
                    <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => play(active)}
                  aria-label={projectLabel(project, active, n, L.playWithSound)}
                  className="group/play inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-amber pl-3 pr-4 md:flex-none text-small font-semibold text-void shadow-glow-amber transition-colors hover:bg-amber-hi md:h-12 md:pl-4 md:pr-5"
                >
                  <Volume2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span className="hidden xs:inline">{L.playWithSound}</span>
                  <span className="xs:hidden">{w.play}</span>
                </button>
                {n > 1 ? (
                  <button type="button" onClick={() => step(1)} aria-label={w.next} className="inline-flex size-11 items-center justify-center rounded-full border border-edge bg-void/50 text-paper backdrop-blur-sm md:hidden">
                    <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ reel index (the DOM list) + category jumps */}
          <div className="mx-auto flex w-full max-w-wide flex-col gap-4 px-(--gutter) pt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="flex min-w-0 items-center gap-4">
              <p className="micro-caps hidden shrink-0 text-ash sm:block" aria-hidden="true">{OB_LABELS.index}</p>
              <ol ref={stripRef} aria-label={OB_LABELS.index} className="ob-strip -my-2 flex min-w-0 gap-2 overflow-x-auto px-1 py-2">
                {projects.map((p, i) => {
                  const on = i === active;
                  const poster = posterOf(p);
                  const thumbAr = aspectOf(p);
                  return (
                    <li key={p.id} className="shrink-0">
                      <button
                        type="button"
                        data-i={i}
                        aria-current={on ? 'true' : undefined}
                        aria-label={projectLabel(p, i, n, L.playWithSound)}
                        onPointerDown={() => { pointerPick.current = { index: i, wasActive: i === active }; }}
                        onFocus={() => {
                          // Keyboard focus puts the project on air; a pointer press is handled on click.
                          if (pointerPick.current?.index !== i) select(i);
                        }}
                        onClick={() => {
                          const pick = pointerPick.current;
                          pointerPick.current = null;
                          if (pick && pick.index === i && !pick.wasActive) select(i);
                          else play(i);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                          e.preventDefault();
                          const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
                          stripRef.current?.querySelector<HTMLElement>(`[data-i="${next}"]`)?.focus();
                        }}
                        className={cn(
                          'ob-thumb group relative flex h-14 items-end overflow-hidden rounded-[4px] border bg-panel md:h-16',
                          on ? 'border-amber' : 'border-hairline opacity-60 hover:opacity-100',
                        )}
                        style={{ aspectRatio: String(Math.min(thumbAr, 16 / 9)) }}
                      >
                        {poster ? <Image src={poster} alt="" fill sizes="120px" className="object-cover" /> : <span aria-hidden="true" className="ebu-bars absolute inset-x-0 bottom-3 h-1.5 opacity-60" />}
                        <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_11_12/0.85),transparent_60%)]" />
                        <span aria-hidden="true" className={cn('tc relative z-1 px-1.5 pb-1 text-[0.6875rem]', on ? 'text-amber' : 'text-paper')}>{pad2(i + 1)}</span>
                        {on ? <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rec shadow-glow-rec" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {categories.length > 1 ? (
              // One scrolling row on phones; wraps on wide screens.
              <div
                role="group"
                aria-label={OB_LABELS.jump}
                className="-mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
              >
                {categories.map((c) => {
                  const on = project.category === c;
                  const count = projects.filter((p) => p.category === c).length;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-current={on ? 'true' : undefined}
                      onClick={() => jump(c)}
                      className={cn(
                        'inline-flex h-9 shrink-0 items-center gap-2 rounded-pill border px-3.5 text-small font-semibold transition-colors duration-hover',
                        on ? 'border-amber text-amber' : 'border-edge text-smoke hover:border-paper hover:text-paper',
                      )}
                    >
                      <span aria-hidden="true" className={cn('size-1.5 rounded-full', on ? 'bg-amber' : 'bg-rule')} />
                      {c}
                      <span className={cn('tc text-[0.75rem]', on ? 'text-amber/70' : 'text-ash')}>{pad2(count)}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <p className="sr-only" aria-live="polite">{status}</p>
        </div>
      ) : null}

      {showRail ? (
        <div className={cn(!hydrated && 'hidden stby:block')}>
          <OrbitRail projects={projects} onOpen={(i) => { lastOpen.current = i; setOpen(i); }} />
        </div>
      ) : null}

      <ProjectPlayer projects={projects} index={open} onIndexChange={onPlayerChange} />
    </div>
  );
}

/** The on-air category in the site's heading style: lead words in white, the last word amber and condensed. */
function CategoryTitle({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? '';
  return (
    <span className="wdth-115 text-title font-semibold leading-none text-paper md:text-h3">
      {words.length ? `${words.join(' ')} ` : ''}
      <span className="cut">{last}.</span>
    </span>
  );
}

/** Static ring still for first paint and while three.js loads (aria-hidden, no motion). */
function Placeholder({ projects, active, ready }: { projects: readonly GalleryProject[]; active: number; ready: boolean }) {
  const n = projects.length;
  const cards: Array<{ p: GalleryProject; o: number; x: number; i: number }> = [];
  const dims = (i: number, onAir: boolean) => dimsFor(aspectOf(projects[i]), onAir);
  const span = Math.min(3, Math.floor((n - 1) / 2) + (n % 2 === 0 ? 1 : 0));
  cards.push({ p: projects[active], o: 0, x: 0, i: active });
  for (const dir of [1, -1] as const) {
    let x = 0;
    let prev = active;
    for (let k = 1; k <= span; k++) {
      const i = (((active + dir * k) % n) + n) % n;
      if (dir === -1 && k === span && n % 2 === 0 && span * 2 >= n) break;
      x += dir * (dims(prev, prev === active && k === 1).w / 2 + GAP + dims(i, false).w / 2);
      cards.push({ p: projects[i], o: dir * k, x, i });
      prev = i;
    }
  }
  return (
    <div aria-hidden="true" className="ob-ph" data-ready={ready}>
      {cards.map(({ p, o, x, i }) => {
        const d = dims(i, o === 0);
        const poster = posterOf(p);
        return (
          <div
            key={`${p.id}-${o}`}
            className="ob-ph-card"
            data-air={o === 0}
            style={{
              ['--x' as string]: x.toFixed(3),
              ['--w' as string]: d.w.toFixed(3),
              ['--h' as string]: d.h.toFixed(3),
              ['--o' as string]: String(o),
              ['--a' as string]: String(Math.min(1, Math.abs(o) * 0.75)),
            }}
          >
            {poster ? <Image src={poster} alt="" fill sizes="(max-width: 48rem) 60vw, 25vw" loading={Math.abs(o) <= 1 ? 'eager' : 'lazy'} fetchPriority={o === 0 ? 'high' : 'auto'} className="object-cover" /> : null}
          </div>
        );
      })}
    </div>
  );
}
