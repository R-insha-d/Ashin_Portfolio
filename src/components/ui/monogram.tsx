import { profile } from '@/content/profile';
import { cn } from '@/lib/cn';
import { MonogramPhoto } from './monogram-photo';

type MonogramProps = {
  className?: string;
  /** Face crop to show inside the brackets (profile.photo.avatar). Omitted or null: the initials. */
  photo?: string | null;
};

/** Decorative monogram in corner brackets: the face crop when given, else "AN". The wrapping link carries the name. */
export function Monogram({ className, photo }: MonogramProps) {
  const initials = (
    <span className="wdth-125 text-[0.95rem] font-extrabold tracking-[-0.02em] text-paper">{profile.initials}</span>
  );
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex size-11 shrink-0 items-center justify-center', className)}
    >
      <span className="corner-brackets absolute inset-0" />
      {photo ? <MonogramPhoto src={photo} fallback={initials} /> : initials}
    </span>
  );
}
