'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { setMotionPref, useMotionPaused } from '@/lib/motion-pref';
import { profile } from '@/content/profile';
import { RecDot } from './rec-dot';

type MotionToggleProps = { variant: 'chip' | 'row'; className?: string };

export function MotionToggle({ variant, className }: MotionToggleProps) {
  const paused = useMotionPaused();
  const hintId = useId();
  const c = profile.copy.motion;

  const chip = (
    <>
      <button
        type="button"
        aria-pressed={paused}
        aria-describedby={hintId}
        onClick={() => setMotionPref(paused ? 'on' : 'paused')}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-pill border border-hairline bg-panel/70 px-3 text-paper transition-colors hover:border-edge',
          variant === 'chip' && className,
        )}
      >
        <RecDot />
        <span className="micro-caps inline-grid">
          <span className="col-start-1 row-start-1 stby:invisible">{c.rec}</span>
          <span className="invisible col-start-1 row-start-1 stby:visible">{c.standby}</span>
        </span>
        <span className="sr-only">, {c.action}</span>
      </button>
      <span id={hintId} className="sr-only">
        {c.hint}
      </span>
    </>
  );

  if (variant === 'chip') return chip;

  return (
    <div className={cn('flex h-14 w-full items-center justify-between gap-4', className)}>
      <span className="label-caps text-ash">
        {c.rowLabel}
      </span>
      <div className="flex items-center">{chip}</div>
    </div>
  );
}
