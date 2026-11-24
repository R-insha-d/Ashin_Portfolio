import type { ReactNode } from 'react';
import { profile } from '@/content/profile';

/** Extra delay between neighbouring rows when they enter view together, in ms. */
const ROW_STAGGER = 100;
/** The rows start after the email block above them (label, address wipe, availability line). */
const ROW_BASE = 300;

/** The call-sheet list. */
export function ContactSheet({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={className}>{children}</ul>;
}

/**
 * One call-sheet row. Entrance (scroll reveal): each row is its own group, so rows that scroll in
 * one at a time (phones) each play on arrival, and rows that arrive together are staggered by
 * `index`. The row rises, its amber "export" bar draws under it, then "Ready" pops at the end.
 */
export function ContactRow({ index, children }: { index: number; children: ReactNode }) {
  const d = ROW_BASE + index * ROW_STAGGER;
  return (
    // Step 1: the timing comes from the explicit delays below, not from the member order.
    <li className="relative" data-rv-group data-rv-step="1" data-rv="rise" data-rv-delay={d}>
      {children}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 block">
        <span data-rv="draw" data-rv-delay={d + 240} className="block h-px w-full bg-amber" />
        <span
          data-rv="pop"
          data-rv-delay={d + 760}
          className="micro-caps absolute right-1 bottom-0 translate-y-1/2 bg-void px-1.5 text-amber sm:right-3"
        >
          {profile.copy.contact.ready}
        </span>
      </span>
    </li>
  );
}
