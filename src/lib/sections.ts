import { profile } from '@/content/profile';
import { SEQUENCE_FRAMES, formatTimecode } from './timecode';

export type SectionId =
  | 'top' | 'work' | 'about' | 'services' | 'skills' | 'experience' | 'highlight' | 'education' | 'contact';

export type SectionMeta = {
  readonly id: SectionId;
  readonly label: string;        // eyebrow / nav label / header HUD label
  readonly inNav: boolean;
  readonly index: number;        // position among rendered sections (top = 0)
  readonly number: string;       // '' for top, else '01'…
  readonly inFrame: number;
  readonly inTimecode: string;
  readonly titleId: `${SectionId}-title`;
};

export const HAS_WORK = profile.showreel !== null || profile.projects.length > 0;

const c = profile.copy;
const ORDER: ReadonlyArray<{ id: SectionId; label: string; inNav: boolean }> = [
  { id: 'top', label: c.hero.hudLabel, inNav: false },
  ...(HAS_WORK ? [{ id: 'work' as const, label: c.work.eyebrow, inNav: true }] : []),
  { id: 'about', label: c.about.eyebrow, inNav: true },
  { id: 'services', label: c.services.eyebrow, inNav: true },
  { id: 'skills', label: c.skills.eyebrow, inNav: true },
  { id: 'experience', label: c.experience.eyebrow, inNav: true },
  { id: 'highlight', label: c.highlight.eyebrow, inNav: false },
  { id: 'education', label: c.education.eyebrow, inNav: true },
  { id: 'contact', label: c.contact.eyebrow, inNav: true },
];

export const SECTIONS: readonly SectionMeta[] = ORDER.map((s, index) => {
  const inFrame = Math.floor((index * SEQUENCE_FRAMES) / ORDER.length);
  return {
    ...s,
    index,
    number: index === 0 ? '' : String(index).padStart(2, '0'),
    inFrame,
    inTimecode: formatTimecode(inFrame),
    titleId: `${s.id}-title` as const,
  };
});

export const NAV_SECTIONS = SECTIONS.filter((s) => s.inNav);

export function getSection(id: SectionId): SectionMeta {
  const s = SECTIONS.find((x) => x.id === id);
  if (!s) throw new Error(`Section "${id}" is not rendered`);
  return s;
}
