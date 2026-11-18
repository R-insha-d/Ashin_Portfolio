'use client';

import { m, useInView } from 'motion/react';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { profile } from '@/content/profile';
import { DURATION, EASE, INSTANT, STAGGER } from '@/lib/motion';
import { useMotionPaused } from '@/lib/motion-pref';

const SheetInView = createContext(false);

/** The call-sheet list. Triggers the export bars once 40% of it is visible. */
export function ContactSheet({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <ul ref={ref} className={className}>
      <SheetInView.Provider value={inView}>{children}</SheetInView.Provider>
    </ul>
  );
}

/** Decorative 1px amber "export" bar under a row, then "Ready". No percentages, ever. */
export function ContactExportBar({ index }: { index: number }) {
  const inView = useContext(SheetInView);
  const paused = useMotionPaused();
  const done = inView || paused;
  const delay = index * STAGGER.trim;
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 block">
      <m.span
        className="block h-px w-full bg-amber"
        style={{ transformOrigin: '0% 50%' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: done ? 1 : 0 }}
        transition={paused ? INSTANT : { duration: DURATION.sweep, ease: EASE.trim, delay }}
      />
      <m.span
        className="micro-caps absolute right-1 bottom-0 translate-y-1/2 bg-void px-1.5 text-amber sm:right-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0 }}
        transition={paused ? INSTANT : { duration: DURATION.quick, ease: 'linear', delay: delay + DURATION.sweep }}
      >
        {profile.copy.contact.ready}
      </m.span>
    </span>
  );
}
