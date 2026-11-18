'use client';

import { goToSection } from '@/lib/navigation';
import type { SectionId } from '@/lib/sections';

type SectionLinkProps = {
  to: SectionId;
  onNavigate?: () => void;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>;

export function SectionLink({ to, onNavigate, children, ...rest }: SectionLinkProps) {
  return (
    <a
      href={`#${to}`}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
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
