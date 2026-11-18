import { getMotionPref, subscribeMotionPref } from '@/lib/motion-pref';

/** How the 3D reel is allowed to load (S1.4). 'pending' is the server snapshot. */
export type LoadPolicy = 'pending' | 'button' | 'idle' | 'interaction';

type NavigatorExtras = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

export function chooseLoadPolicy(): LoadPolicy {
  if (typeof window === 'undefined') return 'pending';
  const nav = navigator as NavigatorExtras;
  let saveData = false;
  try { saveData = nav.connection?.saveData === true; } catch { /* ignore */ }
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  if (saveData || lowMemory || getMotionPref() === 'paused') return 'button';
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && window.innerWidth >= 1024) return 'idle';
  return 'interaction';
}

export function subscribeLoadPolicy(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  const unMotion = subscribeMotionPref(onChange);
  return () => { window.removeEventListener('resize', onChange); unMotion(); };
}

export function getServerLoadPolicy(): LoadPolicy { return 'pending'; }

/** WebGL2 probe, run at trigger time (never at mount). Releases the probe context. */
export function probeWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs `cb` now, or once the intro preloader has finished (html[data-preloader] removed and
 * `preloader:done` dispatched), so WebGL setup never competes with the preloader's animation.
 */
export function afterPreloader(cb: () => void): () => void {
  if (!document.documentElement.hasAttribute('data-preloader')) {
    cb();
    return () => {};
  }
  const on = () => cb();
  window.addEventListener('preloader:done', on, { once: true });
  return () => window.removeEventListener('preloader:done', on);
}

/** After the preloader, then window `load` (or now if already complete), then requestIdleCallback (timeout 2000) or setTimeout(1200). */
export function afterLoadAndIdle(cb: () => void): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timeoutId: number | undefined;
  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(() => { if (!cancelled) cb(); }, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(() => { if (!cancelled) cb(); }, 1200);
    }
  };
  const offPreloader = afterPreloader(() => {
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  });
  return () => {
    cancelled = true;
    offPreloader();
    window.removeEventListener('load', schedule);
    if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  };
}

/** First pointerdown, keydown or touchstart anywhere after the preloader (passive, once). */
export function onFirstInteraction(cb: () => void): () => void {
  const events = ['pointerdown', 'keydown', 'touchstart'] as const;
  let done = false;
  const off = () => { for (const e of events) window.removeEventListener(e, handler, { capture: true }); };
  function handler() {
    if (done) return;
    done = true;
    off();
    cb();
  }
  const offPreloader = afterPreloader(() => {
    for (const e of events) window.addEventListener(e, handler, { passive: true, capture: true });
  });
  return () => {
    offPreloader();
    off();
  };
}
