'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { useMotionPaused } from '@/lib/motion-pref';
import { setLenis } from '@/lib/smooth-scroll';

/**
 * Lenis smooth scrolling for mouse wheels and trackpads.
 * Runs only while motion is on: the Standby toggle and prefers-reduced-motion
 * (both resolve to "paused") keep plain native scrolling. Touch scrolling stays native.
 * Elements marked data-lenis-prevent (the mobile menu dialog) scroll natively.
 */
export function SmoothScroll() {
  const paused = useMotionPaused();

  useEffect(() => {
    if (paused) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      smoothWheel: true,
      allowNestedScroll: true,
    });
    setLenis(lenis);
    // Hold the page still while the intro preloader plays; resume when it hands off.
    let resume: (() => void) | undefined;
    if (document.documentElement.hasAttribute('data-preloader')) {
      lenis.stop();
      resume = () => lenis.start();
      window.addEventListener('preloader:done', resume, { once: true });
    }
    return () => {
      if (resume) window.removeEventListener('preloader:done', resume);
      setLenis(null);
      lenis.destroy();
    };
  }, [paused]);

  return null;
}
