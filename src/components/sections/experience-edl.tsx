import { profile, type Role } from '@/content/profile';
import { Chip } from '@/components/ui/chip';
import { SEPARATOR, formatYearSpan, speakYearSpan, toolNames } from '@/lib/content';

const c = profile.copy.experience;
const DASH = '—';

function eventNo(i: number): string {
  return String(i + 1).padStart(3, '0');
}

function srSentence(role: Role): string {
  const when = role.dates ? speakYearSpan(role.dates) : profile.copy.a11y.datesNotListed;
  return `${when}${SEPARATOR}${role.duration.spoken}`;
}

/** The canonical, server-rendered text of the career: complete without JS. */
export function ExperienceEdl() {
  return (
    <div className="mt-10">
      <div
        aria-hidden="true"
        // Column widths per spec S5.4.
        className="micro-caps hidden grid-cols-[4.5rem_4rem_8rem_4.5rem_1fr] gap-x-4 border-b border-hairline pb-3 text-ash lg:grid"
      >
        <span>{c.edl.columns.event}</span>
        <span>{c.edl.columns.track}</span>
        <span>{c.edl.columns.inOut}</span>
        <span>{c.edl.columns.duration}</span>
        <span>{c.edl.columns.role}</span>
      </div>
      <ol aria-label={c.edl.label} className="flex flex-col gap-4 lg:gap-0">
        {profile.roles.map((role, i) => {
          const track = role.dates ? profile.copy.experience.timeline.trackCodes.v1 : c.edl.binTrack;
          const inOut = role.dates ? formatYearSpan(role.dates) : DASH;
          const org = [role.company, role.location].filter(Boolean).join(SEPARATOR);
          return (
            <li key={role.id}>
              <article
                id={`role-${role.id}`}
                tabIndex={-1}
                aria-labelledby={`role-${role.id}-title`}
                data-role={role.id}
                className="group/row relative scroll-mt-(--scroll-offset) rounded-panel border border-hairline bg-panel p-5 transition-colors duration-hover data-selected:border-amber lg:grid lg:grid-cols-[4.5rem_4rem_8rem_4.5rem_1fr] lg:gap-x-4 lg:rounded-none lg:border-0 lg:border-b lg:border-hairline lg:bg-transparent lg:px-0 lg:py-6"
              >
                <span className="sr-only">{srSentence(role)}</span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-3 hidden w-0.5 bg-amber opacity-0 transition-opacity duration-hover group-data-selected/row:opacity-100 lg:block"
                />
                {/* Desktop meta cells */}
                <span aria-hidden="true" className="tc hidden text-ash group-data-selected/row:text-amber lg:block">{eventNo(i)}</span>
                <span aria-hidden="true" className="tc hidden text-ash group-data-selected/row:text-amber lg:block">{track}</span>
                <span aria-hidden="true" className="tc hidden text-ash group-data-selected/row:text-amber lg:block">{inOut}</span>
                <span aria-hidden="true" className="tc hidden uppercase text-ash group-data-selected/row:text-amber lg:block">{role.duration.short}</span>
                <div className="min-w-0">
                  {/* Mobile meta line */}
                  <div aria-hidden="true" className="mb-3 flex flex-wrap items-center gap-2 lg:hidden">
                    <span className="tc text-ash group-data-selected/row:text-amber">
                      {eventNo(i)}{SEPARATOR}{track}{SEPARATOR}{inOut}{SEPARATOR}<span className="uppercase">{role.duration.short}</span>
                    </span>
                    {role.dates === null && <Chip variant="label">{c.edl.binTrack}</Chip>}
                  </div>
                  <h3 id={`role-${role.id}-title`} className="text-h3 wdth-105 text-paper">{role.title}</h3>
                  {org && <p className="mt-1 text-body text-smoke">{org}</p>}
                  <ul className="mt-4 flex max-w-measure flex-col gap-2 text-body text-smoke">
                    {role.bullets.map((b) => (
                      <li key={b} className="relative pl-5">
                        <span aria-hidden="true" className="absolute left-0.5 top-[0.6em] size-1.5 rotate-45 bg-ash" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {role.tools.length > 0 && (
                    <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                      <span className="label-caps text-ash">{c.edl.toolsLabel}:</span>
                      <span className="text-small text-paper">{toolNames(role.tools, 'full').join(', ')}</span>
                    </p>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
