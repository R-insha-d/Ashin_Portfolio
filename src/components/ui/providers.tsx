'use client';

import { useLayoutEffect } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { applyBootAttributes, useMotionPaused } from '@/lib/motion-pref';
import { SmoothScroll } from './smooth-scroll';

export function Providers({ children }: { children: React.ReactNode }) {
  const paused = useMotionPaused();
  useLayoutEffect(() => {
    if (!document.documentElement.hasAttribute('data-motion')) applyBootAttributes();
  }, []);
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={paused ? 'always' : 'never'}>
        <SmoothScroll />
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
