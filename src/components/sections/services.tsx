import { SectionHeading } from '@/components/ui/section-heading';
import { Section } from '@/components/ui/section';
import { profile } from '@/content/profile';
import { SEPARATOR, toolNames } from '@/lib/content';
import { ServiceCard } from './services-card';

const c = profile.copy.services;

export function Services() {
  return (
    <Section id="services">
      <SectionHeading id="services" eyebrow={c.eyebrow} display={c.display} intro={c.intro} />
      <ul className="mt-(--stack) grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {profile.services.map((s, i) => (
          <li key={s.id} className="flex">
            <ServiceCard
              id={s.id}
              index={String(i + 1).padStart(2, '0')}
              title={s.title}
              body={s.body}
              toolsLabel={c.toolsLabel}
              tools={toolNames(s.tools).join(SEPARATOR)}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
