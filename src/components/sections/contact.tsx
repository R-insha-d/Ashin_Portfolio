import { ArrowUpRight, Download, Languages, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { profile } from '@/content/profile';
import { LinkedInIcon, WhatsAppIcon, type IconComponent } from '@/components/ui/brand-icons';
import { LinkButton } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { ExternalLink } from '@/components/ui/external-link';
import { RecDot } from '@/components/ui/rec-dot';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/cn';
import { ContactRow, ContactSheet } from './contact-sheet';

const c = profile.copy.contact;
const ROW = 'grid min-h-16 grid-cols-[1.25rem_1fr_auto] items-center gap-4 border-b border-hairline px-1 py-3 sm:px-3';
const LINK_ROW = cn(ROW, 'group/row transition-colors duration-hover hover:bg-panel');

function RowBody({
  icon: Icon,
  label,
  value,
  action,
}: {
  icon: IconComponent;
  label: string;
  value?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <>
      <Icon className="size-5 text-smoke" size={20} strokeWidth={1.5} aria-hidden />
      <span className="flex min-w-0 flex-col gap-1 md:flex-row md:items-baseline md:gap-6">
        <span className="label-caps text-ash md:w-32 md:shrink-0">{label}</span>
        {value !== undefined && (
          <>
            <span className="sr-only">, </span>
            <span className="text-title text-paper [overflow-wrap:anywhere]">{value}</span>
          </>
        )}
      </span>
      {action !== undefined ? (
        <span className="flex items-center gap-1.5 text-small text-smoke">
          <span className="sr-only">, </span>
          <span>{action}</span>
          <ArrowUpRight
            className="size-4 transition-transform duration-hover ease-standard group-hover/row:translate-x-1 group-hover/row:-translate-y-1 group-focus-visible/row:translate-x-1 group-focus-visible/row:-translate-y-1"
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
    </>
  );
}

export function Contact() {
  const { contact, languages, location, cv } = profile;
  return (
    <Section id="contact">
      <div className="page-grid">
        <div className="col-span-full lg:col-span-7">
          <SectionHeading id="contact" eyebrow={c.eyebrow} display={c.display} intro={c.intro} />
          <p data-rv="focus" data-rv-delay="200" className="mt-6 flex max-w-lead items-baseline gap-3 text-lead text-paper">
            <RecDot className="bg-amber shadow-glow-amber" />
            <span>{c.availability}</span>
          </p>
        </div>
      </div>

      {/* Entrance (scroll reveal): the label fades up, the address wipes on like an edit, then the
          copy button pops in once the address has mostly landed. */}
      <div data-rv-group data-rv-step="120" className="@container mt-(--stack)">
        <p data-rv="rise" data-rv-delay="150" className="label-caps text-ash">
          {c.emailLabel}
        </p>
        <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* The wipe clips to this wrapper; its vertical padding keeps descenders inside the clip. */}
          <div data-rv="wipe" data-rv-delay="150" className="-my-2 min-w-0 py-2">
            <a
              href={`mailto:${contact.email}`}
              className="link-wipe wdth-110 block font-semibold text-paper text-[clamp(1.25rem,6.4cqi,3.5rem)] leading-none [overflow-wrap:anywhere]"
            >
              {contact.email}
            </a>
          </div>
          <span data-rv="pop" data-rv-delay="560" className="flex shrink-0">
            <CopyButton
              size="md"
              value={contact.email}
              srSuffix={profile.copy.copyButton.emailSuffix}
              announcement={profile.copy.copyButton.emailAnnouncement}
            />
          </span>
        </div>
      </div>

      <ContactSheet className="mt-(--stack) border-t border-hairline">
        <ContactRow index={0}>
          <a href={contact.phone.href} className={LINK_ROW}>
            <RowBody icon={Phone} label={c.rows.phone} value={contact.phone.display} action={c.actions.call} />
          </a>
        </ContactRow>
        <ContactRow index={1}>
          <ExternalLink href={contact.whatsapp.href} showIcon={false} className={LINK_ROW}>
            <RowBody icon={WhatsAppIcon} label={c.rows.whatsapp} action={c.actions.whatsapp} />
          </ExternalLink>
        </ContactRow>
        <ContactRow index={2}>
          <ExternalLink href={contact.linkedin.href} showIcon={false} className={LINK_ROW}>
            <RowBody
              icon={LinkedInIcon}
              label={c.rows.linkedin}
              value={contact.linkedin.display}
              action={
                <>
                  {c.actions.linkedin}
                  <span className="sr-only"> {c.actions.linkedinSuffix}</span>
                </>
              }
            />
          </ExternalLink>
        </ContactRow>
        <ContactRow index={3}>
          <div className={ROW}>
            <RowBody icon={MapPin} label={c.rows.location} value={location.display} />
          </div>
        </ContactRow>
        <ContactRow index={4}>
          <div className={ROW}>
            <RowBody
              icon={Languages}
              label={c.rows.languages}
              value={languages.map((l, n) => (
                <span key={l.name}>
                  {n > 0 && ', '}
                  {l.name}
                  {l.nativeName && (
                    <>
                      {' ('}
                      <span lang={l.lang}>{l.nativeName}</span>
                      {')'}
                    </>
                  )}
                </span>
              ))}
            />
          </div>
        </ContactRow>
      </ContactSheet>

      {cv && (
        <div data-rv="rise" className="mt-(--stack)">
          <LinkButton href={cv.href} download variant="secondary" icon={Download}>
            {cv.label}
          </LinkButton>
        </div>
      )}
    </Section>
  );
}
