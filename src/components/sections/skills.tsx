import { Box, Film, Shapes, Wrench, type LucideIcon } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { SectionHeading } from '@/components/ui/section-heading';
import { Section } from '@/components/ui/section';
import { profile, type SkillGroup } from '@/content/profile';
import { getTool } from '@/lib/content';

const c = profile.copy.skills;

const GROUP_ICONS: Record<SkillGroup['id'], LucideIcon> = {
  'video-motion': Film,
  'graphic-design': Shapes,
  '3d-modeling': Box,
};

/**
 * Scroll reveal timing (ms): panels cascade after the heading, then each panel's icon and tool rows follow.
 * The cascade only makes sense side by side: on phones the panels stack and each plays as it scrolls in,
 * so the `max-md:[--rv-delay:…]!` classes below reset every panel to the first panel's timing
 * (they beat the inline delay the controller sets; keep them equal to PANEL_DELAY, +120 and +150).
 */
const PANEL_DELAY = 150;
const PANEL_STEP = 100;

function ToolPanel({ group, index }: { group: SkillGroup; index: number }) {
  const delay = PANEL_DELAY + index * PANEL_STEP;
  const Icon = GROUP_ICONS[group.id] ?? Wrench;
  const titleId = `tools-${group.id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      // Each panel is its own reveal group (so it plays when it scrolls in, also when stacked on phones):
      // the panel lands as a card, then its icon pops and its tool rows rise in sequence.
      data-rv-group
      data-rv-step="80"
      data-rv="card"
      data-rv-delay={delay}
      className="rounded-panel border border-hairline bg-panel max-md:[--rv-delay:150ms]! md:last:col-span-2 lg:last:col-span-1"
    >
      <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
        <Icon
          size={20}
          strokeWidth={1.5}
          aria-hidden="true"
          data-rv="pop"
          data-rv-delay={delay + 120}
          className="shrink-0 text-amber max-md:[--rv-delay:270ms]!"
        />
        <h3 id={titleId} className="text-title text-paper">
          {group.title}
        </h3>
        {/* NOTE(integrator): no copy key for "N tools"; reuses copy.services.toolsLabel (uppercased by micro-caps). */}
        <span aria-hidden="true" className="micro-caps ml-auto shrink-0 text-ash">
          {group.tools.length} {profile.copy.services.toolsLabel}
        </span>
      </div>
      <ul>
        {group.tools.map((toolId) => {
          const tool = getTool(toolId);
          return (
            <li
              key={tool.id}
              data-rv="rise"
              data-rv-delay={delay + 150}
              className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-5 py-3 last:border-0 max-md:[--rv-delay:300ms]!"
            >
              <span className="flex flex-col">
                <span className="text-small text-smoke">{tool.vendor}</span>
                <span className="wdth-105 text-title text-paper">{tool.shortName}</span>
              </span>
              <span className="flex flex-wrap gap-2">
                <span className="sr-only">{c.extensionsLabel}: </span>
                {tool.extensions.map((ext) => (
                  <Chip key={ext} variant="ext">
                    {ext}
                  </Chip>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Skills() {
  return (
    <Section id="skills">
      <SectionHeading id="skills" eyebrow={c.eyebrow} display={c.display} intro={c.intro} />
      <div className="mt-(--stack) grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {profile.skillGroups.map((g, i) => (
          <ToolPanel key={g.id} group={g} index={i} />
        ))}
      </div>
      {/* Scroll reveal: the label rises out of its mask line, then the chips pop one by one. On wide screens
          this row enters together with the panels, so it waits for them; below lg it enters on its own and
          the max-lg classes shorten the wait. */}
      <div data-rv-group data-rv-step="90" className="mt-10">
        <h3 data-rv="mask" data-rv-delay="400" className="label-caps text-ash max-lg:[--rv-delay:150ms]!">
          {c.otherTitle}
        </h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.otherSkills.map((s) => (
            <li key={s} data-rv="pop" data-rv-delay="460" className="flex max-lg:[--rv-delay:200ms]!">
              <Chip variant="tag">{s}</Chip>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
