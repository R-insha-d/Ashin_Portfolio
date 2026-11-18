'use client';

import { useRef } from 'react';
import { m, type Variants } from 'motion/react';
import { cn } from '@/lib/cn';
import { DURATION, EASE, STAGGER, preset } from '@/lib/motion';
import { useMotionPaused } from '@/lib/motion-pref';
import { getSection, type SectionId } from '@/lib/sections';
import type { DisplayLine } from '@/content/profile';
import { Reveal, useRevealControls, withDelay } from './reveal';

type SectionHeadingProps = {
  id: SectionId;
  eyebrow: string;
  display: DisplayLine;
  intro?: string;
  align?: 'start' | 'center';
  className?: string;
};

/** The 2px amber leading edge that travels with the wipe, then fades. Hidden unless armed. */
const EDGE: Variants = {
  hidden: { left: '0%', opacity: 1 },
  shown: {
    left: '100%',
    opacity: 0,
    transition: {
      left: { duration: DURATION.wipe, ease: EASE.wipe, delay: STAGGER.jcut },
      opacity: { duration: DURATION.quick, ease: 'linear', delay: STAGGER.jcut + DURATION.wipe },
    },
  },
};

export function SectionHeading({ id, eyebrow, display, intro, align = 'start', className }: SectionHeadingProps) {
  const meta = getSection(id);
  const ref = useRef<HTMLHeadingElement>(null);
  const paused = useMotionPaused();
  const controls = useRevealControls(ref, 0.4);
  const wipe = meta.index % 2 === 1;
  const center = align === 'center';

  return (
    <div className={cn(center && 'flex flex-col items-center text-center', className)}>
      <h2 ref={ref} id={meta.titleId} tabIndex={-1} className={cn('flex flex-col gap-4', center && 'items-center')}>
        <m.span
          className="label-caps flex items-center gap-3 text-ash"
          variants={preset('cut', paused)}
          initial={false}
          animate={controls}
        >
          <span aria-hidden="true" className="h-px w-6 bg-amber" />
          {eyebrow}
        </m.span>
        <span className="sr-only">: </span>
        <span className="relative">
          <m.span
            className={cn('block wdth-115 text-display text-balance max-w-[22ch] text-paper', center && 'mx-auto')}
            variants={withDelay(preset(wipe ? 'wipe' : 'cut', paused), STAGGER.jcut)}
            initial={false}
            animate={controls}
          >
            {display.lead}
            <span className="cut">{display.cut}</span>
          </m.span>
          {wipe && !paused ? (
            <m.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-amber opacity-0"
              variants={EDGE}
              initial={false}
              animate={controls}
            />
          ) : null}
        </span>
      </h2>
      {intro ? (
        <Reveal as="p" className={cn('mt-5 max-w-lead text-lead text-smoke', center && 'mx-auto')}>
          {intro}
        </Reveal>
      ) : null}
    </div>
  );
}
