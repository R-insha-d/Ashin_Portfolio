import { cn } from '@/lib/cn';
import { getSection, type SectionId } from '@/lib/sections';
import { profile } from '@/content/profile';
import { Container } from './container';

type SectionProps = {
  id: SectionId;
  size?: 'page' | 'wide';
  pad?: 'default' | 'hero' | 'spacious';
  cutLine?: boolean;
  bare?: boolean;
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
};

const PAD = {
  default: 'py-(--section-y)',
  hero: 'pt-[calc(var(--header-h)+1.5rem)] pb-(--section-y)',
  spacious: 'py-[calc(var(--section-y)*1.25)]',
} as const;

function CutLine({ number, inTimecode }: { number: string; inTimecode: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -translate-y-1/2">
      <div className="mx-auto flex w-full max-w-page items-center gap-3 px-(--gutter)">
        <span className="cut-line h-px flex-1 bg-hairline [--cut-origin:100%_50%]" />
        <span className="micro-caps flex h-6 shrink-0 items-center gap-1.5 rounded-pill border border-hairline bg-void px-2.5 text-ash">
          <span>][</span>
          <span>{number}</span>
          <span>·</span>
          <span>{profile.copy.sequence.inPoint}</span>
          <span className="tc text-[length:inherit]">{inTimecode}</span>
        </span>
        <span className="cut-line h-px flex-1 bg-hairline [--cut-origin:0%_50%]" />
      </div>
    </div>
  );
}

export function Section({
  id,
  size = 'page',
  pad = 'default',
  cutLine = true,
  bare = false,
  className,
  innerClassName,
  children,
}: SectionProps) {
  const meta = getSection(id);
  return (
    <section id={id} aria-labelledby={meta.titleId} className={cn('relative scroll-mt-(--scroll-offset)', PAD[pad], className)}>
      {cutLine && meta.index > 0 ? <CutLine number={meta.number} inTimecode={meta.inTimecode} /> : null}
      {bare ? (
        children
      ) : (
        <Container size={size} className={innerClassName}>
          {children}
        </Container>
      )}
    </section>
  );
}
