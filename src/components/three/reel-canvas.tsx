'use client';

import { useEffect, useRef } from 'react';
import { getMotionPref, subscribeMotionPref } from '@/lib/motion-pref';
import { getReelState, setFrame, setReelState, subscribeCommand, type ReelCanvasProps } from './reel-store';
import { ReelStage } from './reel-stage';

/**
 * Lazy 3D entry (S1.4): the only module graph that imports three. Loaded by reel-monitor through
 * a module-scope next/dynamic with ssr:false. The canvas is created imperatively per mount, so the
 * dev Strict Mode double mount gets a fresh WebGL context each time and the old one is released.
 */
export default function ReelCanvas({ pictureRef, scrollProgress, onReady, onFail }: ReelCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Latest callbacks without re-running the effect (written in an effect, never during render).
  const cbRef = useRef({ onReady, onFail });
  useEffect(() => {
    cbRef.current = { onReady, onFail };
  }, [onReady, onFail]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const picture = pictureRef.current ?? host;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;';
    host.appendChild(canvas);

    const mq = (q: string) => window.matchMedia(q).matches;
    let stage: ReelStage | null = null;
    let failed = false;
    let disposed = false;
    const fail = (reason: 'unavailable' | 'fallback') => {
      if (failed || disposed) return;
      failed = true;
      cbRef.current.onFail(reason);
    };

    try {
      stage = new ReelStage(
        {
          canvas,
          picture,
          coarse: mq('(pointer: coarse)'),
          fine: mq('(hover: hover) and (pointer: fine)'),
          motionOn: getMotionPref() !== 'paused',
        },
        {
          onReady: () => cbRef.current.onReady(),
          onFail: fail,
          onModeChange: (mode, playing) => setReelState({ mode, playing }),
          onFrame: (f) => setFrame(f),
        },
      );
    } catch {
      // WebGLRenderer throws when no context can be created.
      fail('unavailable');
      canvas.remove();
      return;
    }
    const s = stage;

    s.start().catch(() => fail('fallback'));

    const offCommand = subscribeCommand((cmd) => {
      // The store has already flipped `playing` for toggle; mirror its result so both stay in sync.
      if (cmd.type === 'toggle') s.command({ type: getReelState().playing ? 'play' : 'pause' });
      else s.command(cmd);
    });
    const offMotion = subscribeMotionPref(() => s.setMotion(getMotionPref() !== 'paused'));
    s.setScroll(scrollProgress.get());
    const offScroll = scrollProgress.on('change', (p) => s.setScroll(p));

    return () => {
      disposed = true;
      offCommand();
      offMotion();
      offScroll();
      s.dispose();
      canvas.remove();
    };
  }, [pictureRef, scrollProgress]);

  return <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />;
}
