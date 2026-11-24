'use client';

import { useEffect, useRef } from 'react';
import { m, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { profile, type YearSpan } from '@/content/profile';
import { DATED_ROLES, DIPLOMA, RULER_YEARS, spanToGridLines } from '@/lib/content';
import { SPRING } from '@/lib/motion';
import { useMotionPaused } from '@/lib/motion-pref';

function col(span: YearSpan): string {
  const { start, end } = spanToGridLines(span);
  return `${start} / ${end}`;
}

/** <1024 mini timeline. Decorative: every fact is in the EDL. Undated roles never appear here. */
export function ExperienceNavigator() {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useMotionPaused();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 40%'] });
  const scrub = useSpring(scrollYProgress, SPRING.scrub);
  const pos = useMotionValue(1);
  const x = useTransform(pos, (v) => `${v * 100}%`);

  useMotionValueEvent(scrub, 'change', (v) => {
    if (!paused) pos.set(v);
  });
  useEffect(() => {
    pos.set(paused ? 1 : scrub.get());
  }, [paused, pos, scrub]);

  const marker = { from: profile.highlight.year, to: profile.highlight.year };

  return (
    // Entrance: an edit wipe, a beat after the section heading (scroll-reveal.css). The wrapper is
    // the trigger, since an observer never sees a target that its own clip-path hides.
    <div data-rv-group className="lg:hidden">
      <div
        ref={ref}
        aria-hidden="true"
        data-rv="wipe"
        data-rv-delay="200"
        // 72px strip per spec S5.3: year labels, marker band, then V2 / V1 / A1 bars (8px each).
        className="relative grid h-[72px] grid-cols-5 grid-rows-[1rem_0.375rem_0.5rem_0.5rem_0.5rem] content-center gap-y-1 overflow-hidden rounded-panel border border-hairline bg-panel px-3 py-0.5 lg:hidden"
      >
        {RULER_YEARS.map((year, i) => (
          <span key={year} className="micro-caps border-l border-rule pl-1 text-ash" style={{ gridColumn: `${i + 1} / ${i + 2}`, gridRow: 1 }}>
            {year}
          </span>
        ))}
        <span className="border-t-2 border-amber bg-amber-wash" style={{ gridColumn: col(marker), gridRow: 2 }} />
        <span className="rounded-full bg-v2" style={{ gridColumn: col(DIPLOMA.dates), gridRow: 3 }} />
        {DATED_ROLES.map((r) => (
          <span key={r.id} className="mx-px rounded-full bg-v1" style={{ gridColumn: col(r.dates), gridRow: 4 }} />
        ))}
        {DATED_ROLES.filter((r) => r.tools.length > 0).map((r) => (
          <span key={r.id} className="mx-px rounded-full bg-a1/60" style={{ gridColumn: col(r.dates), gridRow: 5 }} />
        ))}
        <div className="pointer-events-none absolute inset-y-0 left-3 right-3">
          <m.div className="absolute inset-y-0 left-0 w-full" style={{ x }}>
            <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-amber" />
          </m.div>
        </div>
      </div>
    </div>
  );
}
