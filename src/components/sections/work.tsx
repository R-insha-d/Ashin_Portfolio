import { ArrowRight } from 'lucide-react';
import { profile, type Showreel } from '@/content/profile';
import { LinkButton } from '@/components/ui/button';
import { MonitorFrame } from '@/components/ui/monitor-frame';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { ProjectGallery } from '@/components/work/project-gallery';
import { galleryProjects, projectCategories } from '@/lib/projects';
import { HAS_WORK } from '@/lib/sections';

const w = profile.copy.work;
const pp = profile.copy.projectsPage;
/** How many projects the home page shows when none are marked "featured". */
const HOME_FALLBACK_COUNT = 4;

function ShowreelBlock({ reel }: { reel: Showreel }) {
  return (
    <div>
      <MonitorFrame label={`${profile.copy.monitor.program} · ${w.showreelLabel}`} aspect="16 / 9">
        <video controls preload="none" playsInline poster={reel.poster} className="absolute inset-0 h-full w-full bg-void">
          {reel.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
          {reel.captions && (
            <track kind="captions" src={reel.captions.src} srcLang={reel.captions.srcLang} label={reel.captions.label} default />
          )}
        </video>
      </MonitorFrame>
      <div className="mt-6 grid gap-3">
        <h3 className="text-title text-paper">{reel.title}</h3>
        {reel.durationLabel !== null && (
          <p className="text-small text-smoke">
            <span className="label-caps text-ash">{w.durationLabel}</span>
            <span className="sr-only">: </span> <span>{reel.durationLabel}</span>
          </p>
        )}
        {reel.audioNote !== null && <p className="text-small text-smoke">{reel.audioNote}</p>}
        <div className="max-w-measure">
          <p className="label-caps text-ash">{w.descriptionLabel}</p>
          <p className="mt-2 text-body text-smoke">{reel.description}</p>
        </div>
      </div>
    </div>
  );
}

/** Home page: the showreel (if any), the featured projects, and a link to the full Projects page. */
export function Work() {
  if (!HAS_WORK) return null;
  const reel = profile.showreel;
  const all = galleryProjects();
  const featured = all.filter((p) => p.featured);
  const shown = featured.length > 0 ? featured : all.slice(0, HOME_FALLBACK_COUNT);
  const intro = reel && all.length ? w.introReelAndProjects : reel ? w.introReel : w.introProjects;

  return (
    <Section id="work" size="wide">
      <SectionHeading id="work" eyebrow={w.eyebrow} display={w.display} intro={intro} />
      <div className="mt-(--stack) grid gap-(--stack)">
        {reel && <ShowreelBlock reel={reel} />}
        {shown.length > 0 && (
          <div className="flex flex-col gap-6">
            <ProjectGallery projects={shown} />
            {/* Scroll reveal: the rule draws on, the count rolls up from 00, then the line and the button rise. */}
            <div data-rv-group data-rv-step="110">
              <span aria-hidden="true" data-rv="draw" data-rv-delay="200" className="block h-px bg-hairline" />
              <div className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
                <p data-rv="rise" data-rv-delay="200" className="micro-caps flex flex-wrap items-center gap-x-2 gap-y-1 text-ash">
                  <span data-rv="fade" data-rv-count data-rv-delay="60" className="tc text-paper">
                    {String(all.length).padStart(2, '0')}
                  </span>
                  <span>{pp.eyebrow}</span>
                  <span aria-hidden="true">·</span>
                  <span>{projectCategories().join(' / ')}</span>
                </p>
                <div data-rv="rise" data-rv-delay="200">
                  <LinkButton href="/projects" variant="secondary" size="lg" iconEnd={ArrowRight}>
                    {w.seeAll}
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
