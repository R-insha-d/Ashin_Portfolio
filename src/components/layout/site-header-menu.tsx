'use client';

import { Mail, Menu, Phone, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { profile } from '@/content/profile';
import { NAV_SECTIONS, type SectionId } from '@/lib/sections';
import { LinkedInIcon, WhatsAppIcon } from '@/components/ui/brand-icons';
import { Container } from '@/components/ui/container';
import { ExternalLink } from '@/components/ui/external-link';
import { Monogram } from '@/components/ui/monogram';
import { MotionToggle } from '@/components/ui/motion-toggle';
import { SectionLink } from '@/components/ui/section-link';

const copy = profile.copy;
const { contact } = profile;

const toggleClass =
  'inline-flex h-11 items-center gap-2 rounded-button border border-hairline px-3 text-small font-semibold text-paper transition-colors hover:border-edge';
const tileClass =
  'flex h-14 items-center gap-3 rounded-button border border-hairline bg-panel px-4 text-small font-semibold text-paper transition-colors hover:border-edge';

export function SiteHeaderMenu({ active }: { active: SectionId }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => { dialogRef.current?.showModal(); setOpen(true); }}
        className={`${toggleClass} lg:hidden`}
      >
        <Menu size={18} strokeWidth={1.5} aria-hidden />
        {copy.header.menu}
      </button>

      <dialog
        ref={dialogRef}
        data-lenis-prevent
        id="site-menu"
        aria-label={copy.header.menuLabel}
        onClose={() => setOpen(false)}
        className="m-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-void p-0 text-paper transition-[clip-path] duration-wipe ease-wipe [clip-path:inset(0)] backdrop:bg-void/80 starting:open:[clip-path:inset(0_0_100%_0)]"
      >
        <Container size="wide" className="flex min-h-full flex-col pb-8">
          <div className="flex h-(--header-h) shrink-0 items-center justify-between gap-4">
            <span aria-hidden="true"><Monogram photo={profile.photo?.avatar} /></span>
            <button type="button" onClick={close} className={toggleClass}>
              <X size={18} strokeWidth={1.5} aria-hidden />
              {copy.header.close}
            </button>
          </div>

          <nav aria-label={copy.header.menuNavLabel} className="mt-4">
            <ul className="border-t border-hairline">
              {NAV_SECTIONS.map((s) => (
                <li key={s.id} className="border-b border-hairline">
                  <SectionLink
                    to={s.id}
                    onNavigate={close}
                    aria-current={active === s.id ? 'location' : undefined}
                    className="group flex h-14 items-center gap-3 text-paper"
                  >
                    <span aria-hidden="true" className="micro-caps w-6 shrink-0 text-ash">{s.number}</span>
                    <span className="wdth-110 text-feature group-aria-[current=location]:text-amber">{s.label}</span>
                    <span aria-hidden="true" className="min-w-4 flex-1 border-b border-dotted border-rule" />
                    <span aria-hidden="true" className="tc shrink-0 text-ash">{s.inTimecode}</span>
                  </SectionLink>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-10 label-caps text-ash">{copy.header.menuContactTitle}</p>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            <li>
              <a href={`mailto:${contact.email}`} className={tileClass}>
                <Mail size={20} strokeWidth={1.5} aria-hidden />
                {copy.header.email}
              </a>
            </li>
            <li>
              <a href={contact.phone.href} className={tileClass}>
                <Phone size={20} strokeWidth={1.5} aria-hidden />
                {copy.header.call}
              </a>
            </li>
            <li>
              <ExternalLink href={contact.whatsapp.href} showIcon={false} className={tileClass}>
                <WhatsAppIcon size={20} />
                {copy.header.whatsapp}
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href={contact.linkedin.href} showIcon={false} className={tileClass}>
                <LinkedInIcon size={20} />
                {copy.header.linkedin}
              </ExternalLink>
            </li>
          </ul>

          <MotionToggle variant="row" className="mt-6" />
        </Container>
      </dialog>
    </>
  );
}
