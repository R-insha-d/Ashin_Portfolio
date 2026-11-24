'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLenis } from '@/lib/smooth-scroll';
import { goToSection } from '@/lib/navigation';
import { getMotionPref } from '@/lib/motion-pref';
import type { SectionId } from '@/lib/sections';

type SectionLinkProps = {
  to: SectionId;
  /**
   * "home" (default): a home-page section; from another page it navigates to /#section.
   * "page": only for to="top" — back to the top of whichever page is open (footer).
   */
  scope?: 'home' | 'page';
  onNavigate?: () => void;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>;

function isModified(e: React.MouseEvent) {
  return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented;
}

export function SectionLink({ to, scope = 'home', onNavigate, children, ...rest }: SectionLinkProps) {
  const onHome = usePathname() === '/';

  // On another page (e.g. /projects): "back to top" scrolls this page; everything else goes home.
  if (!onHome) {
    if (scope === 'page' && to === 'top') {
      return (
        <a
          href="#main"
          onClick={(e) => {
            if (isModified(e)) return;
            e.preventDefault();
            onNavigate?.();
            const lenis = getLenis();
            if (lenis) lenis.scrollTo(0);
            else window.scrollTo({ top: 0, behavior: getMotionPref() === 'paused' ? 'auto' : 'smooth' });
          }}
          {...rest}
        >
          {children}
        </a>
      );
    }
    // Always a hash, so the home page scrolls to that section (Next keeps the home page mounted,
    // and its automatic scroll-to-top is skipped because the page starts with a fixed header).
    return (
      <Link href={`/#${to}`} onClick={() => onNavigate?.()} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        if (isModified(e)) return;
        e.preventDefault();
        onNavigate?.();
        goToSection(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
