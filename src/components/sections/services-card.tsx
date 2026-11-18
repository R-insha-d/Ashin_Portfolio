'use client';

import { m, useAnimationControls, useInView, type Variants } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import type { ServiceId } from '@/content/profile';
import { EASE } from '@/lib/motion';
import { useMotionPaused } from '@/lib/motion-pref';

type ServiceCardProps = {
  id: ServiceId;
  index: string;
  title: string;
  body: string;
  toolsLabel: string;
  tools: string;
};

/** Scope glyph paths per service (112x56 viewBox). Decorative only. */
const GLYPHS: Record<ServiceId, readonly string[]> = {
  // Three clips on a track line, with a vertical playhead.
  'video-editing': [
    'M4 42H108',
    'M8 20h30v16H8z',
    'M42 20h24v16H42z',
    'M70 20h34v16H70z',
    'M56 6V50',
    'M52 6h8l-4 5z',
  ],
  // A bezier curve with two keyframe diamonds and their handles.
  'motion-graphics': [
    'M12 44C42 44 70 12 100 12',
    'M12 44H42',
    'M100 12H70',
    'M42 44m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M70 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M12 39l5 5-5 5-5-5z',
    'M100 7l5 5-5 5-5-5z',
  ],
  // An isometric wire cube with a tiny XYZ gizmo.
  '3d': [
    'M50 8L66 17L50 26L34 17Z',
    'M34 17V37L50 46L66 37V17',
    'M50 26V46',
    'M88 46h10',
    'M88 46v-10',
    'M88 46l-7 7',
  ],
  // A pen path with square anchor points and one handle.
  'graphic-design': [
    'M10 44C24 14 56 8 66 30S92 46 102 18',
    'M7 41h6v6H7z',
    'M63 27h6v6h-6z',
    'M99 15h6v6h-6z',
    'M58 14L74 46',
    'M58 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    'M74 46m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ],
};

const DRAW: Variants = {
  hidden: { pathLength: 0, opacity: 0, transition: { duration: 0 } },
  shown: { pathLength: 1, opacity: 1, transition: { duration: 0.8, ease: EASE.trim } },
};

export function ServiceCard({ id, index, title, body, toolsLabel, tools }: ServiceCardProps) {
  const ref = useRef<HTMLElement>(null);
  const armed = useRef(false);
  const controls = useAnimationControls();
  const paused = useMotionPaused();
  const inView = useInView(ref, { once: true, amount: 0.4 });

  // Arm the first draw only when the card starts below the fold; server HTML stays fully drawn.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || paused || armed.current) return;
    if (el.getBoundingClientRect().top > window.innerHeight) {
      armed.current = true;
      controls.set('hidden');
    }
  }, [controls, paused]);

  useLayoutEffect(() => {
    if (!armed.current) return;
    if (paused) {
      armed.current = false;
      controls.set('shown');
      return;
    }
    if (!inView) return;
    armed.current = false;
    void controls.start('shown');
  }, [inView, paused, controls]);

  const redraw = () => {
    if (paused) return;
    controls.set('hidden');
    void controls.start('shown');
  };

  const titleId = `service-${id}-title`;

  return (
    <article
      ref={ref}
      aria-labelledby={titleId}
      onPointerEnter={redraw}
      onFocus={redraw}
      className="group/card relative flex w-full flex-col gap-4 rounded-panel border border-hairline bg-panel p-6 transition-[transform,border-color] duration-hover ease-standard hover:-translate-y-0.5 hover:border-edge focus-within:-translate-y-0.5 lg:p-7 stby:transition-none stby:hover:translate-y-0 stby:focus-within:translate-y-0"
    >
      <span
        aria-hidden="true"
        className="corner-brackets pointer-events-none absolute inset-0 rounded-panel opacity-0 transition-opacity duration-hover ease-standard group-hover/card:opacity-100 group-focus-within/card:opacity-100"
      />
      <div className="flex items-start justify-between gap-4">
        <span aria-hidden="true" className="micro-caps text-ash">
          {index}
        </span>
        <m.svg
          aria-hidden="true"
          focusable="false"
          width={112}
          height={56}
          viewBox="0 0 112 56"
          fill="none"
          className="shrink-0 stroke-smoke/60"
          initial={false}
          animate={controls}
        >
          {GLYPHS[id].map((d) => (
            <m.path
              key={d}
              d={d}
              variants={DRAW}
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </m.svg>
      </div>
      <h3 id={titleId} className="wdth-110 text-h3 text-paper">
        {title}
      </h3>
      <p className="text-body text-smoke">{body}</p>
      <p className="mt-auto flex flex-col gap-1 border-t border-hairline pt-4">
        <span className="label-caps text-ash">{toolsLabel}</span>
        <span className="sr-only">: </span>
        <span className="text-small text-paper">{tools}</span>
      </p>
    </article>
  );
}
