import { ArrowDown, Mail } from 'lucide-react';
import { ReelMonitor } from '@/components/three/reel-monitor';
import { LinkedInIcon, WhatsAppIcon } from '@/components/ui/brand-icons';
import { LinkButton } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Section } from '@/components/ui/section';
import { Timecode } from '@/components/ui/timecode';
import { profile } from '@/content/profile';
import { DIPLOMA, LATEST_ROLE, SEPARATOR, toolNames } from '@/lib/content';

const copy = profile.copy;
const hero = copy.hero;
const slate = hero.slate;
const contact = profile.contact;

const SLATE_ROW = 'grid grid-cols-1 gap-x-4 gap-y-1 border-t border-hairline py-2.5 sm:grid-cols-[6.5rem_1fr]';
const DT = 'label-caps text-ash';
const DD = 'text-small text-paper';

function Slate() {
  const latest = LATEST_ROLE.company ? `${LATEST_ROLE.title}, ${LATEST_ROLE.company}` : LATEST_ROLE.title;
  return (
    <div className="overflow-hidden rounded-clip border border-hairline bg-panel">
      <div aria-hidden="true" className="clapper-band h-1.5 origin-bottom-left animate-clap stby:animate-none" />
      <div aria-hidden="true" className="flex items-center justify-between gap-3 px-4 py-2">
        <span className="micro-caps text-ash">{slate.label}</span>
        <Timecode frames={0} className="text-ash" />
      </div>
      <dl aria-label={slate.ariaLabel} className="px-4">
        <div className={SLATE_ROW}>
          <dt className={DT}>{slate.tools}</dt>
          <dd className={DD}>{toolNames(profile.tools.map((t) => t.id)).join(SEPARATOR)}</dd>
        </div>
        <div className={SLATE_ROW}>
          <dt className={DT}>{slate.latest}</dt>
          <dd className={DD}>{latest}</dd>
        </div>
        <div className={SLATE_ROW}>
          <dt className={DT}>{slate.workedAt}</dt>
          <dd className={DD}>{profile.roles.map((r) => r.orgLabel).join(SEPARATOR)}</dd>
        </div>
        <div className={SLATE_ROW}>
          <dt className={DT}>{slate.training}</dt>
          <dd className={DD}>{DIPLOMA.qualification}</dd>
        </div>
        <div className={SLATE_ROW}>
          <dt className={DT}>{slate.contact}</dt>
          <dd className={`${DD} flex flex-wrap items-center gap-x-3 gap-y-1`}>
            <a href={`mailto:${contact.email}`} className="link-wipe break-all">{contact.email}</a>
            <CopyButton
              size="sm"
              value={contact.email}
              srSuffix={copy.copyButton.emailSuffix}
              announcement={copy.copyButton.emailAnnouncement}
            />
            <a href={contact.phone.href} className="link-wipe tabular-nums">{contact.phone.display}</a>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function Hero() {
  return (
    <Section id="top" cutLine={false} size="wide" pad="hero" className="lg:flex lg:min-h-[min(100svh,64rem)] lg:items-center">
      <div className="page-grid gap-y-8 lg:gap-y-10">
        <div className="@container col-span-full lg:col-span-6 lg:row-start-1">
          <p data-intro="eyebrow" className="label-caps text-ash">{hero.eyebrow}</p>
          <h1 id="top-title" tabIndex={-1} className="mt-5">
            <span data-intro="name" className="block whitespace-nowrap wdth-125 text-name uppercase text-paper">{profile.name}</span>
            <span className="sr-only">, </span>
            <span data-intro="role" className="mt-3 block wdth-110 text-title text-paper">
              {profile.roleParts.before} <span className="cut">&amp;</span> {profile.roleParts.after}
            </span>
          </h1>
          <p data-intro="lead" className="mt-6 max-w-lead text-lead text-smoke">{hero.lead}</p>
          <div data-intro="ctas" className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkButton href={`mailto:${contact.email}`} variant="primary" size="lg" icon={Mail} className="w-full sm:w-auto">
              {hero.ctaEmail}
            </LinkButton>
            {profile.showreel && (
              <LinkButton href="#work" variant="secondary" size="lg" className="w-full sm:w-auto">
                {hero.ctaShowreel}
              </LinkButton>
            )}
            <LinkButton href="#experience" variant="secondary" size="lg" icon={ArrowDown} className="hidden sm:inline-flex">
              {hero.ctaTimeline}
            </LinkButton>
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <LinkButton href={contact.whatsapp.href} external variant="secondary" size="lg" icon={WhatsAppIcon}>
                {hero.ctaWhatsApp}
              </LinkButton>
              <LinkButton href={contact.linkedin.href} external variant="secondary" size="lg" icon={LinkedInIcon}>
                {hero.ctaLinkedIn}
              </LinkButton>
            </div>
          </div>
        </div>
        <div data-intro="monitor" className="col-span-full lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-center lg:justify-self-end lg:w-[calc(100%-10px)]">
          <ReelMonitor />
        </div>
        <div data-intro="slate" className="col-span-full lg:col-span-6 lg:row-start-2 lg:self-end">
          <Slate />
        </div>
      </div>
    </Section>
  );
}
