import { profile } from '@/content/profile';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { ExperienceEdl } from './experience-edl';
import { ExperienceNavigator } from './experience-navigator';
import { ExperienceStage } from './experience-stage';
import { ExperienceTimeline } from './experience-timeline';

const c = profile.copy.experience;

export function Experience() {
  return (
    <Section id="experience" size="wide">
      <SectionHeading id="experience" eyebrow={c.eyebrow} display={c.display} intro={c.intro} />
      <div className="mt-(--stack)">
        <ExperienceStage>
          <ExperienceTimeline />
          <ExperienceNavigator />
          <ExperienceEdl />
        </ExperienceStage>
      </div>
    </Section>
  );
}
