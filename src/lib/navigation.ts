import { getMotionPref } from './motion-pref';
import type { SectionId } from './sections';
import { getLenis } from './smooth-scroll';

export function goToSection(id: SectionId, options: { pushHash?: boolean } = {}): void {
  const section = document.getElementById(id);
  if (!section) return;
  const heading = document.getElementById(`${id}-title`);
  const lenis = getLenis();
  // Lenis honours the section's scroll-margin-top, so headings clear the sticky header.
  if (lenis) lenis.scrollTo(section);
  else section.scrollIntoView({ behavior: getMotionPref() === 'paused' ? 'auto' : 'smooth', block: 'start' });
  if (options.pushHash !== false) history.pushState(null, '', `#${id}`);
  heading?.focus({ preventScroll: true });
}
