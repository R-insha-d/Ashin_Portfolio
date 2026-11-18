import { profile } from '@/content/profile';
import { cn } from '@/lib/cn';

/** Decorative "AN" monogram in corner brackets. The wrapping link carries the name. */
export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex size-11 shrink-0 items-center justify-center', className)}
    >
      <span className="corner-brackets absolute inset-0" />
      <span className="wdth-125 text-[0.95rem] font-extrabold tracking-[-0.02em] text-paper">
        {profile.initials}
      </span>
    </span>
  );
}
