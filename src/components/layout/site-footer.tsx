import { ArrowUp, Mail } from 'lucide-react';
import { profile } from '@/content/profile';
import { SEQUENCE_FRAMES, formatTimecode } from '@/lib/timecode';
import { LinkedInIcon, WhatsAppIcon } from '@/components/ui/brand-icons';
import { Container } from '@/components/ui/container';
import { ExternalLink } from '@/components/ui/external-link';
import { SectionLink } from '@/components/ui/section-link';

const copy = profile.copy;
const { contact } = profile;
const OUT = formatTimecode(SEQUENCE_FRAMES);
const IN = formatTimecode(0);

const linkClass = 'link-wipe inline-flex min-h-6 items-center gap-2 text-small text-paper';

export function SiteFooter() {
  return (
    <footer className="relative border-t border-hairline">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-1/2 justify-center">
        <span className="micro-caps flex h-6 shrink-0 items-center gap-1.5 rounded-pill border border-hairline bg-void px-2.5 text-ash">
          <span>][</span><span>{copy.sequence.outPoint}</span><span>·</span>
          <span className="tc text-[length:inherit]">{OUT}</span>
        </span>
      </div>

      <Container className="flex flex-col items-center gap-5 py-(--section-y) text-center">
        <p className="credits-row micro-caps text-ash">{copy.footer.creditsLabel}</p>
        <p className="credits-row wdth-125 text-feature uppercase text-paper">{profile.name}</p>
        <p className="credits-row text-title text-paper">{profile.role}</p>
        <p className="credits-row text-small text-smoke">{profile.location.display}</p>

        <ul aria-label={copy.footer.linksLabel} className="credits-row flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <li>
            <a href={`mailto:${contact.email}`} className={linkClass}>
              <Mail size={16} strokeWidth={1.5} aria-hidden />
              {copy.header.email}
            </a>
          </li>
          <li>
            <ExternalLink href={contact.linkedin.href} showIcon={false} className={linkClass}>
              <LinkedInIcon size={16} />
              {copy.header.linkedin}
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href={contact.whatsapp.href} showIcon={false} className={linkClass}>
              <WhatsAppIcon size={16} />
              {copy.header.whatsapp}
            </ExternalLink>
          </li>
        </ul>

        <div className="credits-row mt-4 flex flex-col items-center gap-3">
          <SectionLink
            to="top"
            className="group/btn relative inline-flex h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-button border border-edge px-5 text-small font-semibold tracking-[0.01em] text-paper transition-[background-color,border-color,color,transform] duration-hover ease-standard hover:border-paper hover:bg-panel active:scale-[0.98]"
          >
            <ArrowUp size={18} strokeWidth={1.5} aria-hidden />
            {copy.footer.backToTop}
          </SectionLink>
          <span aria-hidden="true" className="tc text-ash">
            {copy.sequence.inPoint} {IN}
          </span>
        </div>

        <p className="credits-row mt-4 label-caps text-ash">
          {copy.sequence.end}
          <span aria-hidden="true"> · </span>
          <span className="tc text-[length:inherit]">{OUT}</span>
        </p>
        <p className="credits-row text-small text-ash">{copy.footer.copyright}</p>
      </Container>
    </footer>
  );
}
