'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { m, useScroll, useTransform } from 'motion/react';
import { Box, Pause, Play, StepBack, StepForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonitorFrame } from '@/components/ui/monitor-frame';
import { RecDot } from '@/components/ui/rec-dot';
import { StableLabel } from '@/components/ui/stable-label';
import { profile } from '@/content/profile';
import { cn } from '@/lib/cn';
import { useIsCoarsePointer } from '@/lib/hooks';
import { useMotionPaused } from '@/lib/motion-pref';
import { formatTimecode } from '@/lib/timecode';
import {
  afterLoadAndIdle,
  chooseLoadPolicy,
  getServerLoadPolicy,
  onFirstInteraction,
  probeWebGL2,
  subscribeLoadPolicy,
} from './load-policy';
import { ReelPoster } from './reel-poster';
import {
  command,
  getFrame,
  getReelState,
  setReelStatus,
  subscribeFrame,
  useReelState,
  type ReelCanvasProps,
  type ReelStatus,
} from './reel-store';

// Module scope (S1.4): the three chunk is requested only when <ReelCanvas> first renders.
const ReelCanvas = dynamic<ReelCanvasProps>(
  () =>
    import('./reel-canvas').catch(() => {
      setReelStatus('fallback');
      return { default: () => null };
    }),
  { ssr: false, loading: () => null },
);

const mc = profile.copy.monitor;
const STATUS_TEXT: Record<ReelStatus, string> = mc.status;
const STATUS_OPTIONS = Object.values(mc.status);
const MODE_OPTIONS = Object.values(mc.modes);
const BUTTON_OPTIONS = [mc.viewIn3d, mc.loading3d];
const HINT_OPTIONS = [mc.hintPointer, mc.hintTouch];
const BUFFER_TIMEOUT_MS = 15000;
const DISSOLVE_MS = 600; // DURATION.dissolve

function StatusDot({ status }: { status: ReelStatus }) {
  if (status === 'live') return <RecDot />;
  if (status === 'buffering') {
    return <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full bg-amber animate-pulse-soft stby:animate-none" />;
  }
  return <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-[1px] bg-ash" />;
}

export function ReelMonitor({ className }: { className?: string }) {
  const policy = useSyncExternalStore(subscribeLoadPolicy, chooseLoadPolicy, getServerLoadPolicy);
  const { status, mode, playing } = useReelState();
  const paused = useMotionPaused();
  const coarse = useIsCoarsePointer();
  const [mount, setMount] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  const descId = useId();

  const groupRef = useRef<HTMLDivElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<HTMLDivElement>(null);
  const viewBtnRef = useRef<HTMLButtonElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const inViewRef = useRef(false);
  const wantedRef = useRef(false);
  const focusPendingRef = useRef(false);
  const bufferTimerRef = useRef<number | undefined>(undefined);

  // Scroll target: the hero <section> that holds this monitor. Set before useScroll's own effect.
  useLayoutEffect(() => {
    heroRef.current = groupRef.current?.closest('section') ?? null;
  }, []);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const matte = useTransform(scrollYProgress, [0.35, 1], [0, 1], { clamp: true });

  const start = useCallback(() => {
    if (getReelState().status !== 'standby') return;
    focusPendingRef.current = typeof document !== 'undefined' && document.activeElement === viewBtnRef.current && viewBtnRef.current !== null;
    if (!probeWebGL2()) {
      setReelStatus('unavailable');
      return;
    }
    setReelStatus('buffering');
    setMount(true);
    window.clearTimeout(bufferTimerRef.current);
    bufferTimerRef.current = window.setTimeout(() => {
      if (getReelState().status === 'buffering') setReelStatus('fallback');
    }, BUFFER_TIMEOUT_MS);
  }, []);

  const maybeStart = useCallback(() => {
    if (wantedRef.current && inViewRef.current) start();
  }, [start]);

  // In-view tracking (threshold 0.1) for the idle and interaction policies.
  useEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) maybeStart();
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [maybeStart]);

  // Policy triggers. Re-evaluated whenever the policy changes while still in standby.
  useEffect(() => {
    if (status !== 'standby') return;
    if (policy === 'idle') return afterLoadAndIdle(() => { wantedRef.current = true; maybeStart(); });
    if (policy === 'interaction') return onFirstInteraction(() => { wantedRef.current = true; maybeStart(); });
    return undefined;
  }, [policy, status, maybeStart]);

  useEffect(() => () => window.clearTimeout(bufferTimerRef.current), []);

  // Live: clear the buffer timeout, dissolve the canvas in, then unmount the poster.
  useEffect(() => {
    if (status !== 'buffering') window.clearTimeout(bufferTimerRef.current);
    if (status === 'live') {
      if (focusPendingRef.current) {
        focusPendingRef.current = false;
        transportRef.current?.querySelector<HTMLButtonElement>('[data-reel-play]')?.focus();
      }
      const t = window.setTimeout(() => setPosterGone(true), paused ? 0 : DISSOLVE_MS);
      return () => window.clearTimeout(t);
    }
    if ((status === 'unavailable' || status === 'fallback') && focusPendingRef.current) {
      focusPendingRef.current = false;
      groupRef.current?.focus();
    }
    return undefined;
  }, [status, paused]);

  // Reel timecode: written straight to textContent, no React renders.
  useEffect(() => {
    const write = (f: number) => { if (tcRef.current) tcRef.current.textContent = formatTimecode(f); };
    write(getFrame());
    return subscribeFrame(write);
  }, []);

  const onViewIn3d = () => {
    wantedRef.current = true;
    start();
  };

  const onTransportKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || status !== 'live') return;
    const key = e.key.toLowerCase();
    if (key === 'j' || key === 'arrowleft') command({ type: 'step', delta: -1 });
    else if (key === 'arrowright') command({ type: 'step', delta: 1 });
    else if (key === 'k') command({ type: 'toggle' });
    else if (key === 'l') command({ type: 'play' });
    else return;
    e.preventDefault();
  };

  const live = status === 'live';
  const showCanvas = mount && (status === 'buffering' || live);
  const showPoster = !live || !posterGone;
  const showButton = (policy === 'interaction' || policy === 'button') && (status === 'standby' || status === 'buffering');
  const buffering = status === 'buffering';
  const modeLabel = mc.modes[mode];

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={mc.groupLabel}
      aria-describedby={descId}
      tabIndex={-1}
      className={cn('outline-none focus-visible:outline-2', className)}
    >
      <span id={descId} className="sr-only">{mc.groupDescription}</span>
      <MonitorFrame
        label={mc.program}
        aspect="4 / 3"
        footerSize="lg"
        guides
        cropMarks
        grain
        vignette
        pictureRef={pictureRef}
        // Mobile cap per S1.2; desktop cap keeps the monitor under the header and inside the first viewport.
        pictureClassName={cn(
          'max-h-[38svh] touch-pan-y sm:max-h-none lg:max-h-[calc(100svh-var(--header-h)-8rem)]',
          live && 'cursor-grab active:cursor-grabbing',
        )}
        pictureProps={{ 'data-reel-status': status } as React.HTMLAttributes<HTMLDivElement>}
        status={
          <span aria-hidden="true" className="flex items-center gap-2 text-ash">
            <StatusDot status={status} />
            <StableLabel options={STATUS_OPTIONS} value={STATUS_TEXT[status]} className="micro-caps text-end" />
          </span>
        }
        footerStart={
          <span aria-hidden="true" className="flex min-w-0 flex-col justify-center leading-none">
            <span ref={tcRef} className="tc tc-fixed text-paper">{formatTimecode(0)}</span>
            <span className="micro-caps mt-1 text-ash">{mc.reelClock}</span>
          </span>
        }
        footerCenter={
          <div ref={transportRef} role="group" aria-label={mc.transportLabel} onKeyDown={onTransportKey} className="flex items-center gap-1">
            <Button type="button" variant="quiet" size="md" className="size-11 px-0" aria-label={mc.back} disabled={!live} onClick={() => command({ type: 'step', delta: -1 })}>
              <StepBack size={18} strokeWidth={1.5} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="md"
              className="size-11 px-0"
              data-reel-play=""
              aria-label={playing ? mc.pause : mc.play}
              disabled={!live}
              onClick={() => command({ type: 'toggle' })}
            >
              {playing ? <Pause size={18} strokeWidth={1.5} aria-hidden="true" /> : <Play size={18} strokeWidth={1.5} aria-hidden="true" />}
            </Button>
            <Button type="button" variant="quiet" size="md" className="size-11 px-0" aria-label={mc.forward} disabled={!live} onClick={() => command({ type: 'step', delta: 1 })}>
              <StepForward size={18} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
        }
        footerEnd={
          <span aria-hidden="true" className="flex justify-end">
            <StableLabel
              options={MODE_OPTIONS}
              value={modeLabel}
              className={cn('micro-caps', mode === 'jog' || mode === 'shuttle' ? 'text-amber' : 'text-ash')}
            />
          </span>
        }
        pictureOverlay={
          <div className="pointer-events-none absolute inset-0">
            {buffering && (
              <span aria-hidden="true" className="absolute inset-0 animate-scan overflow-hidden stby:hidden">
                <span className="absolute inset-x-0 bottom-0 h-px bg-amber/70" />
              </span>
            )}
            {!paused && (
              <>
                <m.span aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 origin-top bg-void" style={{ scaleY: matte }} />
                <m.span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 origin-bottom bg-void" style={{ scaleY: matte }} />
              </>
            )}
            {showButton && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <button
                  ref={viewBtnRef}
                  type="button"
                  aria-disabled={buffering || undefined}
                  onClick={buffering ? undefined : onViewIn3d}
                  className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-button border border-edge bg-panel/85 px-4 text-small font-semibold text-paper transition-colors duration-hover hover:border-paper aria-disabled:opacity-60"
                >
                  <Box size={18} strokeWidth={1.5} aria-hidden="true" />
                  <StableLabel options={BUTTON_OPTIONS} value={buffering ? mc.loading3d : mc.viewIn3d} />
                </button>
              </div>
            )}
          </div>
        }
      >
        {showPoster && <ReelPoster />}
        {showCanvas && (
          <div className={cn('absolute inset-0 transition-opacity duration-dissolve ease-linear', live ? 'opacity-100' : 'opacity-0')}>
            <ReelCanvas
              pictureRef={pictureRef}
              scrollProgress={scrollYProgress}
              onReady={() => setReelStatus('live')}
              onFail={(s) => setReelStatus(s)}
            />
          </div>
        )}
      </MonitorFrame>
      <p aria-hidden={!live || undefined} className="mt-3 min-h-6 text-small text-ash">
        {live && <StableLabel options={HINT_OPTIONS} value={coarse ? mc.hintTouch : mc.hintPointer} />}
      </p>
    </div>
  );
}
