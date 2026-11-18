import type Lenis from 'lenis';

/**
 * The live Lenis instance, or null when smooth scrolling is off
 * (motion paused via the Rec/Standby toggle, prefers-reduced-motion, or before hydration).
 * Client-only: set by <SmoothScroll />, read by navigation helpers.
 */
let instance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return instance;
}

export function setLenis(next: Lenis | null): void {
  instance = next;
}
