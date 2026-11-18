import type { Transition, Variants } from 'motion/react';

/** One frame at 25 fps, in seconds. */
export const FRAME = 0.04;

export const EASE = {
  wipe: [0.77, 0, 0.175, 1],
  rise: [0.22, 1, 0.36, 1],
  trim: [0.65, 0, 0.35, 1],
  sweep: [0.45, 0, 0.55, 1],
  standard: [0.4, 0, 0.2, 1],
  clap: [0.55, 0, 1, 0.45],
} as const;

export const DURATION = {
  cut: 0, frame: FRAME, quick: 0.15, hover: 0.25, rise: 0.6, dissolve: 0.6, wipe: 0.7, trim: 0.8, sweep: 1.6,
} as const;

export const STAGGER = { rise: 0.06, trim: 0.12, jcut: 0.12 } as const;

export const SPRING = {
  snap: { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 } satisfies Transition,
  /** For useSpring on scroll-linked playheads. */
  scrub: { stiffness: 180, damping: 30, restDelta: 0.0005 },
} as const;

export type PresetName = 'rise' | 'wipe' | 'trim' | 'fade' | 'dissolve' | 'cut';

export const PRESETS: Record<PresetName, Variants> = {
  rise: { hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0, transition: { duration: DURATION.rise, ease: EASE.rise } } },
  wipe: {
    hidden: { clipPath: 'inset(0% 100% 0% 0%)' },
    shown: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: DURATION.wipe, ease: EASE.wipe } },
  },
  trim: { hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { duration: DURATION.trim, ease: EASE.trim } } },
  fade: { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: DURATION.dissolve, ease: 'linear' } } },
  dissolve: { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: DURATION.dissolve, ease: 'linear' } } },
  cut: { hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 0 } } },
};

/** Every preset collapses to this when motion is paused (Standby or reduced motion). */
export const REDUCED: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: DURATION.quick, ease: 'linear' } },
};

export function preset(name: PresetName, paused: boolean): Variants {
  return paused ? REDUCED : PRESETS[name];
}

export const INSTANT: Transition = { duration: 0 };
