import { profile, type EducationEntry } from '@/content/profile';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { Reveal } from '@/components/ui/reveal';
import { EDUCATION_SCALE, spanToFraction, speakYearSpan } from '@/lib/content';
import { STAGGER } from '@/lib/motion';
import { cn } from '@/lib/cn';

const c = profile.copy.education;

/** Newest first (the CV order already is). */
const ENTRIES: readonly EducationEntry[] = [...profile.education].sort((a, b) => b.dates.to - a.dates.to);

function Years({ entry }: { entry: EducationEntry }) {
  const { from, to } = entry.dates;
  return (
    <p className="tc text-amber">
      <span aria-hidden="true">
        <span>[ </span>
        {from}
        {from !== to && (
          <>
            <span> — </span>
            {to}
          </>
        )}
        <span> ]</span>
      </span>
      <span className="sr-only">{speakYearSpan(entry.dates)}</span>
    </p>
  );
}

function RangeBar({ entry }: { entry: EducationEntry }) {
  const { left, width } = spanToFraction(entry.dates, EDUCATION_SCALE);
  return (
    <div aria-hidden="true" className="relative mt-auto h-0.5 w-full bg-hairline">
      <span className="absolute inset-y-0 bg-amber" style={{ left: `${left * 100}%`, width: `${width * 100}%` }} />
    </div>
  );
}

export function Education() {
  return (
    <Section id="education">
      <SectionHeading id="education" eyebrow={c.eyebrow} display={c.display} />
      <ul className="mt-(--stack) grid gap-5 md:grid-cols-2 lg:grid-cols-12">
        {ENTRIES.map((entry, i) => (
          <Reveal
            as="li"
            key={entry.id}
            delay={i * STAGGER.rise}
            className={cn(entry.featured ? 'md:col-span-2 lg:col-span-6' : 'lg:col-span-3')}
          >
            <article
              id={`edu-${entry.id}`}
              tabIndex={-1}
              aria-labelledby={`edu-${entry.id}-title`}
              className="flex h-full scroll-mt-(--scroll-offset) flex-col gap-3 rounded-panel border border-hairline bg-panel p-6"
            >
              <Years entry={entry} />
              <h3
                id={`edu-${entry.id}-title`}
                className={cn('text-paper', entry.featured ? 'text-feature wdth-110' : 'text-h3')}
              >
                {entry.qualification}
              </h3>
              <div>
                <p className="text-body text-paper">{entry.institution}</p>
                {entry.place && <p className="text-small text-smoke">{entry.place}</p>}
                {entry.board && <p className="text-small text-smoke">{entry.board}</p>}
              </div>
              <RangeBar entry={entry} />
            </article>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
