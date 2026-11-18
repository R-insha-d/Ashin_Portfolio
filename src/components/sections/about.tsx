import { AboutPortrait } from '@/components/sections/about-portrait';
import { MonitorFrame } from '@/components/ui/monitor-frame';
import { Reveal } from '@/components/ui/reveal';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { Timecode } from '@/components/ui/timecode';
import { profile } from '@/content/profile';
import { DIPLOMA } from '@/lib/content';
import { STAGGER } from '@/lib/motion';
import { resolvePhoto } from '@/lib/photo';
import { getSection } from '@/lib/sections';

const copy = profile.copy;

function Languages() {
  return (
    <>
      {profile.languages.map((l, i) => (
        <span key={l.name}>
          {i > 0 ? ', ' : null}
          {l.name}
          {l.nativeName ? (
            <>
              {' ('}
              <span lang={l.lang}>{l.nativeName}</span>
              {')'}
            </>
          ) : null}
        </span>
      ))}
    </>
  );
}

/** Server Component: resolvePhoto reads the file system. */
export function About() {
  const photo = resolvePhoto(profile.photo);
  const p = copy.about.properties;
  const properties: ReadonlyArray<{ key: string; label: string; value: React.ReactNode }> = [
    { key: 'experience', label: p.experience, value: profile.experienceLabel },
    { key: 'roles', label: p.roles, value: profile.roles.length },
    { key: 'tools', label: p.tools, value: profile.tools.length },
    { key: 'training', label: p.training, value: DIPLOMA.qualification },
    { key: 'languages', label: p.languages, value: <Languages /> },
    { key: 'basedIn', label: p.basedIn, value: profile.location.display },
  ];
  const [lead, ...rest] = copy.about.paragraphs;

  return (
    <Section id="about">
      <div className="page-grid gap-y-(--stack)">
        <SectionHeading
          id="about"
          eyebrow={copy.about.eyebrow}
          display={copy.about.display}
          className="col-span-full md:col-start-4 md:col-end-9 md:row-start-1 lg:col-start-6 lg:col-end-13"
        />

        <MonitorFrame
          label={copy.monitor.source}
          aspect="4 / 5"
          footerSize="sm"
          guides
          cropMarks
          grain
          footerStart={<Timecode frames={getSection('about').inFrame} />}
          footerEnd={<span className="micro-caps text-ash">{copy.monitor.portraitAspect}</span>}
          className="col-span-full w-full max-w-[26rem] self-start md:col-start-1 md:col-end-4 md:row-start-1 md:row-end-3 md:max-w-none lg:col-end-5"
        >
          <div className="@container absolute inset-0">
            <div aria-hidden="true" className="ebu-bars absolute inset-0 flex items-center justify-center">
              <span className="wdth-125 text-[clamp(4rem,22cqi,9rem)] leading-none font-extrabold text-transparent [-webkit-text-stroke:1px_rgb(243_239_231_/_0.24)]">
                {profile.initials}
              </span>
            </div>
            {photo ? <AboutPortrait src={photo.src} alt={photo.alt} focus={photo.focus ?? '50% 30%'} /> : null}
          </div>
        </MonitorFrame>

        <div className="col-span-full flex flex-col gap-(--stack) md:col-start-4 md:col-end-9 md:row-start-2 lg:col-start-6 lg:col-end-13">
          <div className="flex flex-col gap-5">
            {lead ? <p className="max-w-measure text-lead text-paper">{lead}</p> : null}
            {rest.map((para) => (
              <p key={para} className="max-w-measure text-body text-smoke">
                {para}
              </p>
            ))}
          </div>

          <dl
            aria-label={copy.about.propertiesTitle}
            className="grid grid-cols-2 gap-6 border-t border-hairline pt-6 xl:grid-cols-3"
          >
            {properties.map((item, i) => (
              <Reveal key={item.key} as="div" delay={i * STAGGER.rise} className="flex flex-col gap-1.5">
                <dt className="label-caps text-ash">{item.label}</dt>
                <dd className="text-title text-paper">{item.value}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}
