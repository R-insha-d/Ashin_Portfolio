import { useSyncExternalStore, type RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { getMotionPref } from '@/lib/motion-pref';

/** Monitor states (S1.3). */
export type ReelStatus = 'standby' | 'buffering' | 'live' | 'unavailable' | 'fallback';
export type ReelMode = 'play' | 'pause' | 'jog' | 'shuttle';
export type ReelState = { readonly status: ReelStatus; readonly mode: ReelMode; readonly playing: boolean };
/** Transport commands: step ±1 frame, toggle, play, pause. */
export type ReelCommand =
  | { readonly type: 'step'; readonly delta: 1 | -1 }
  | { readonly type: 'toggle' }
  | { readonly type: 'play' }
  | { readonly type: 'pause' };

/** Props of the lazy default export of `reel-canvas.tsx`. */
export type ReelCanvasProps = {
  /** The monitor's picture element: size source (ResizeObserver) and pointer target (jog, tilt). */
  pictureRef: RefObject<HTMLDivElement | null>;
  /** Hero scroll progress 0..1 (`useScroll` ['start start', 'end start']) for the dolly and lift. */
  scrollProgress: MotionValue<number>;
  /** First frame rendered after compileAsync. Same as setReelStatus('live'). */
  onReady: () => void;
  /** Context lost or no WebGL → 'unavailable'; FPS monitor gave up or scene error → 'fallback'. */
  onFail: (status: 'unavailable' | 'fallback') => void;
};

const SERVER_STATE: ReelState = { status: 'standby', mode: 'pause', playing: false };
let state: ReelState = SERVER_STATE;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function getReelState(): ReelState { return state; }
export function getServerReelState(): ReelState { return SERVER_STATE; }
export function subscribeReel(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setReelState(patch: Partial<ReelState>): void {
  const next = { ...state, ...patch };
  if (next.status === state.status && next.mode === state.mode && next.playing === state.playing) return;
  state = next;
  emit();
}
/** Going live starts in Play when motion is on, otherwise in Pause. Failure states stop playback. */
export function setReelStatus(status: ReelStatus): void {
  if (status === state.status) return;
  if (status === 'live') {
    const play = getMotionPref() !== 'paused';
    setReelState({ status, playing: play, mode: play ? 'play' : 'pause' });
  } else if (status === 'unavailable' || status === 'fallback') {
    setReelState({ status, playing: false, mode: 'pause' });
  } else {
    setReelState({ status });
  }
}
/** jog / shuttle are transient; set the resting mode back ('play' or 'pause') when they settle. */
export function setReelMode(mode: ReelMode): void { setReelState({ mode }); }
export function setReelPlaying(playing: boolean): void { setReelState({ playing, mode: playing ? 'play' : 'pause' }); }

export function useReelState(): ReelState {
  return useSyncExternalStore(subscribeReel, getReelState, getServerReelState);
}

// ─── Frame channel: no React renders; readers write textContent directly. ───
let frame = 0;
const frameListeners = new Set<(frame: number) => void>();
export function getFrame(): number { return frame; }
export function setFrame(next: number): void {
  const f = Math.max(0, Math.floor(next));
  if (f === frame) return;
  frame = f;
  for (const l of frameListeners) l(frame);
}
export function subscribeFrame(listener: (frame: number) => void): () => void {
  frameListeners.add(listener);
  return () => { frameListeners.delete(listener); };
}

// ─── Commands: play/pause/toggle update the store here; every command is also forwarded to the stage. ───
const commandListeners = new Set<(cmd: ReelCommand) => void>();
export function subscribeCommand(listener: (cmd: ReelCommand) => void): () => void {
  commandListeners.add(listener);
  return () => { commandListeners.delete(listener); };
}
export function command(cmd: ReelCommand): void {
  if (state.status !== 'live') return;
  if (cmd.type === 'toggle') setReelPlaying(!state.playing);
  else if (cmd.type === 'play') setReelPlaying(true);
  else if (cmd.type === 'pause') setReelPlaying(false);
  for (const l of commandListeners) l(cmd);
}

/** Object form of the same API. */
export const reelStore = {
  getState: getReelState,
  getServerState: getServerReelState,
  subscribe: subscribeReel,
  setState: setReelState,
  setStatus: setReelStatus,
  setMode: setReelMode,
  setPlaying: setReelPlaying,
  getFrame,
  setFrame,
  subscribeFrame,
  command,
  subscribeCommand,
} as const;
