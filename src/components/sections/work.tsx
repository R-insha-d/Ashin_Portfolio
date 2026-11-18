import Image from 'next/image';
import { profile, type Project, type Showreel } from '@/content/profile';
import { LinkButton } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ExternalLink } from '@/components/ui/external-link';
import { MonitorFrame } from '@/components/ui/monitor-frame';
import { Monogram } from '@/components/ui/monogram';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { toolNames } from '@/lib/content';
import { publicFileExists } from '@/lib/photo';
import { HAS_WORK } from '@/lib/sections';

const w = profile.copy.work;

function ShowreelBlock({ reel }: { reel: Showreel }) {
  return (
    <div>
      <MonitorFrame label={`${profile.copy.monitor.program} · ${w.showreelLabel}`} aspect="16 / 9">
        <video controls preload="none" playsInline poster={reel.poster} className="absolute inset-0 h-full w-full bg-void">
          {reel.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
          {reel.captions && (
            <track
              kind="captions"
              src={reel.captions.src}
              srcLang={reel.captions.srcLang}
              label={reel.captions.label}
              default
            />
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

function ProjectCard({ project }: { project: Project }) {
  const image = project.image && publicFileExists(project.image.src) ? project.image : null;
  const tools = toolNames(project.tools);
  return (
    <li className="h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-panel border border-hairline bg-panel transition-transform duration-hover ease-standard hover:-translate-y-0.5">
        <div className="relative aspect-video w-full bg-void">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div aria-hidden="true" className="ebu-bars absolute inset-0 flex items-center justify-center">
              <Monogram />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <h3 className="text-title text-paper">{project.title}</h3>
          <p className="text-small text-smoke">
            {w.roleLabel}: {project.role}
          </p>
          {tools.length > 0 && (
            <ul aria-label={w.toolsLabel} className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <Chip key={t} as="li" variant="tag">
                  {t}
                </Chip>
              ))}
            </ul>
          )}
          {project.year !== null && (
            <p className="text-small text-smoke">
              {w.yearLabel}: {project.year}
            </p>
          )}
          {project.client !== null && (
            <p className="text-small text-smoke">
              {w.clientLabel}: {project.client}
            </p>
          )}
          <p className="text-body text-smoke">{project.summary}</p>
          {project.link &&
            (/^https?:\/\//.test(project.link.href) ? (
              <ExternalLink href={project.link.href} className="link-wipe mt-auto inline-flex w-fit items-center gap-1.5 text-small text-paper">
                {project.link.label}
              </ExternalLink>
            ) : (
              <LinkButton href={project.link.href} variant="secondary" size="sm" className="mt-auto w-fit">
                {project.link.label}
              </LinkButton>
            ))}
        </div>
        <span
          aria-hidden="true"
          className="corner-brackets pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-hover group-hover:opacity-100"
        />
      </article>
    </li>
  );
}

export function Work() {
  if (!HAS_WORK) return null;
  const reel = profile.showreel;
  const projects = profile.projects;
  const intro = reel && projects.length ? w.introReelAndProjects : reel ? w.introReel : w.introProjects;
  return (
    <Section id="work" size="wide">
      <SectionHeading id="work" eyebrow={w.eyebrow} display={w.display} intro={intro} />
      <div className="mt-(--stack) grid gap-(--stack)">
        {reel && <ShowreelBlock reel={reel} />}
        {projects.length > 0 && (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
