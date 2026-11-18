'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { m, useAnimationControls, useInView, type HTMLMotionProps, type Transition, type Variants } from 'motion/react';
import { preset, type PresetName } from '@/lib/motion';
import { useMotionPaused } from '@/lib/motion-pref';

type RevealTag = 'div' | 'li' | 'p' | 'span' | 'ul' | 'ol' | 'dl' | 'article' | 'figure';

export type RevealProps = {
  as?: RevealTag;
  preset?: PresetName;
  delay?: number;
  amount?: number;
  className?: string;
  children?: React.ReactNode;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'className' | 'initial' | 'animate' | 'variants' | 'ref'>;

/** Adds a delay to the `shown` variant's own transition (variant transitions win over the prop). */
export function withDelay(variants: Variants, delay?: number): Variants {
  if (!delay) return variants;
  const shown = variants.shown;
  if (!shown || typeof shown === 'function') return variants;
  const t = (shown.transition ?? {}) as Transition;
  return { ...variants, shown: { ...shown, transition: { ...t, delay } } };
}

/**
 * Arms (hides) only when below the fold at mount, then reveals once in view.
 * Server HTML and above-the-fold content stay fully visible.
 */
export function useRevealControls(ref: React.RefObject<Element | null>, amount: number) {
  const controls = useAnimationControls();
  const inView = useInView(ref, { once: true, amount });
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight) controls.set('hidden');
  }, [controls, ref]);
  useEffect(() => {
    if (inView) void controls.start('shown');
  }, [inView, controls]);
  return controls;
}

export function Reveal({
  as = 'div',
  preset: name = 'rise',
  delay,
  amount = 0.25,
  className,
  children,
  style,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useMotionPaused();
  const controls = useRevealControls(ref, amount);
  const Comp = m[as] as typeof m.div;
  return (
    <Comp
      ref={ref}
      className={className}
      variants={withDelay(preset(name, paused), delay)}
      initial={false}
      animate={controls}
      style={name === 'trim' ? { transformOrigin: '0% 50%', ...style } : style}
      {...rest}
    >
      {children}
    </Comp>
  );
}
