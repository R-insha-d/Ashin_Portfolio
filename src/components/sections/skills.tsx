import { Box, Film, Shapes, type LucideIcon } from 'lucide-react';
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

function ToolPanel({ group }: { group: SkillGroup }) {
  const Icon = GROUP_ICONS[group.id];
  const titleId = `tools-${group.id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-panel border border-hairline bg-panel md:last:col-span-2 lg:last:col-span-1"
    >
      <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-amber" />
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
              className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-5 py-3 last:border-0"
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
        {profile.skillGroups.map((g) => (
          <ToolPanel key={g.id} group={g} />
        ))}
      </div>
      <div className="mt-10">
        <h3 className="label-caps text-ash">{c.otherTitle}</h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {profile.otherSkills.map((s) => (
            <Chip key={s} as="li" variant="tag">
              {s}
            </Chip>
          ))}
        </ul>
      </div>
    </Section>
  );
}
