'use client';

import { m, useAnimationControls, useInView, type Variants } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { PRESETS, SPRING } from '@/lib/motion';
import { getMotionPref } from '@/lib/motion-pref';

type HighlightMarkerProps = { label: string; className?: string; style?: React.CSSProperties };

const DIAMOND: Variants = {
  hidden: { scale: 0.4, opacity: 0 },
  shown: { scale: 1, opacity: 1, transition: SPRING.snap },
};

/** Range marker over the whole highlight-year cell. Trims in at 40% visible; static in Standby. */
export function HighlightMarker({ label, className, style }: HighlightMarkerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const inView = useInView(ref, { once: true, amount: 0.4 });

  // Arm only when below the fold and motion is on, so server HTML stays fully visible.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || getMotionPref() === 'paused') return;
    if (el.getBoundingClientRect().top > window.innerHeight) controls.set('hidden');
  }, [controls]);

  useLayoutEffect(() => {
    if (inView) void controls.start('shown');
  }, [inView, controls]);

  return (
    <div ref={ref} className={cn('flex min-w-0 flex-col', className)} style={style}>
      <span className="micro-caps pb-2 text-amber">{label}</span>
      <div className="relative flex-1">
        <m.div
          className="absolute inset-0 border-t-2 border-amber bg-amber-wash"
          style={{ transformOrigin: '0% 50%' }}
          variants={PRESETS.trim}
          initial={false}
          animate={controls}
        />
        {/* 10px diamond centred on the band's top edge, at the cell's left edge. */}
        <m.span
          className="absolute -top-[5px] -left-[5px] block size-2.5 bg-amber"
          style={{ rotate: 45 }}
          variants={DIAMOND}
          initial={false}
          animate={controls}
        />
      </div>
    </div>
  );
}
