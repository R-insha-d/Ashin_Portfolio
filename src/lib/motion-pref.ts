import { useSyncExternalStore } from 'react';
import { MOTION_STORAGE_KEY } from './motion-boot';

export type MotionPref = 'on' | 'paused';
const REDUCE = '(prefers-reduced-motion: reduce)';

function readStored(): MotionPref | null {
  try { const v = localStorage.getItem(MOTION_STORAGE_KEY); return v === 'on' || v === 'paused' ? v : null; }
  catch { return null; }
}
/** Same logic as the boot script. Re-applied after dev Strict Mode remounts clear <html> attributes. */
export function applyBootAttributes(): void {
  const d = document.documentElement;
  d.dataset.motion = readStored() ?? (window.matchMedia(REDUCE).matches ? 'paused' : 'on');
  try {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (c?.saveData) d.dataset.saveData = 'true';
  } catch { /* ignore */ }
}
export function getMotionPref(): MotionPref {
  if (typeof document === 'undefined') return 'on';
  return document.documentElement.dataset.motion === 'paused' ? 'paused' : 'on';
}
export function setMotionPref(next: MotionPref): void {
  document.documentElement.dataset.motion = next;
  try { localStorage.setItem(MOTION_STORAGE_KEY, next); } catch { /* private mode */ }
}
export function subscribeMotionPref(onChange: () => void): () => void {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  const mq = window.matchMedia(REDUCE);
  const onMq = () => { if (readStored() === null) document.documentElement.dataset.motion = mq.matches ? 'paused' : 'on'; };
  mq.addEventListener('change', onMq);
  return () => { mo.disconnect(); mq.removeEventListener('change', onMq); };
}
/** Server snapshot is 'on'; CSS (stby: variant) drives first paint, so hydration never mismatches. */
export function useMotionPref(): MotionPref {
  return useSyncExternalStore(subscribeMotionPref, getMotionPref, () => 'on');
}
export function useMotionPaused(): boolean { return useMotionPref() === 'paused'; }
