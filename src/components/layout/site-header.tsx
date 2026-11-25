'use client';

import { m, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { profile } from '@/content/profile';
import { cn } from '@/lib/cn';
import { NAV_SECTIONS, SECTIONS, type SectionId } from '@/lib/sections';
import { SEQUENCE_FRAMES, formatTimecode } from '@/lib/timecode';
import { Container } from '@/components/ui/container';
import { Monogram } from '@/components/ui/monogram';
import { MotionToggle } from '@/components/ui/motion-toggle';
import { RecDot } from '@/components/ui/rec-dot';
import { SectionLink } from '@/components/ui/section-link';
import { SiteHeaderMenu } from './site-header-menu';

const copy = profile.copy;
const DESKTOP_NAV = NAV_SECTIONS.filter((s) => s.id !== 'contact');
const ZERO = formatTimecode(0);

type Anchor = { y: number; f: number };

function writeText(els: ReadonlyArray<HTMLElement | null>, text: string): void {
  for (const el of els) if (el && el.textContent !== text) el.textContent = text;
}
function setScrolling(els: ReadonlyArray<HTMLElement | null>, on: boolean): void {
  for (const el of els) if (el) el.dataset.scrolling = on ? 'true' : 'false';
}

function frameAt(y: number, anchors: readonly Anchor[]): number {
  if (anchors.length === 0) return 0;
  if (y <= anchors[0].y) return anchors[0].f;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    if (y <= b.y) {
      const span = b.y - a.y;
      return span <= 0 ? b.f : a.f + ((y - a.y) / span) * (b.f - a.f);
    }
  }
  return anchors[anchors.length - 1].f;
}

export function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const playheadRef = useRef<HTMLSpanElement>(null);
  const tcRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const hudRefs = useRef<Array<HTMLElement | null>>([]);
  const tickRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const anchorsRef = useRef<Anchor[]>([]);
  const idleTimer = useRef<number | undefined>(undefined);
  const [active, setActive] = useState<SectionId>('top');

  const { scrollY, scrollYProgress } = useScroll();

  // Transparent vs scrolled header (rAF-throttled, attribute only).
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      header.dataset.scrolled = window.scrollY > 24 ? 'true' : 'false';
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Sequence anchors + section ticks, recomputed on resize.
  useEffect(() => {
    const writeTimecode = (y: number) => {
      writeText(tcRefs.current, formatTimecode(frameAt(y, anchorsRef.current)));
    };
    const compute = () => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const anchors: Anchor[] = [];
      let last = 0;
      SECTIONS.forEach((s, i) => {
        const el = document.getElementById(s.id);
        let y = el ? el.getBoundingClientRect().top + window.scrollY - offset : last;
        y = Math.min(Math.max(y, last), maxScroll);
        if (i === 0) y = 0;
        last = y;
        anchors.push({ y, f: s.inFrame });
        const tick = tickRefs.current[i];
        if (tick) tick.style.left = maxScroll > 0 ? `${(y / maxScroll) * 100}%` : '0%';
      });
      anchors.push({ y: maxScroll, f: SEQUENCE_FRAMES });
      anchorsRef.current = anchors;
      writeTimecode(window.scrollY);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  useMotionValueEvent(scrollY, 'change', (y) => {
    writeText(tcRefs.current, formatTimecode(frameAt(y, anchorsRef.current)));
    setScrolling(hudRefs.current, true);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setScrolling(hudRefs.current, false), 160);
  });

  useEffect(() => () => window.clearTimeout(idleTimer.current), []);

  // Active section.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Nav playhead bar (CSS transform, no layoutId).
  useEffect(() => {
    const list = navListRef.current;
    const bar = playheadRef.current;
    if (!list || !bar) return;
    const place = () => {
      const link = list.querySelector<HTMLElement>(`[data-section="${active}"]`);
      if (!link) { bar.style.opacity = '0'; return; }
      const lb = list.getBoundingClientRect();
      const b = link.getBoundingClientRect();
      bar.style.setProperty('--x', `${b.left - lb.left + 12}px`);
      bar.style.setProperty('--w', `${Math.max(0, b.width - 24)}`);
      bar.style.opacity = '1';
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);

  const activeLabel = SECTIONS.find((s) => s.id === active)?.label ?? SECTIONS[0].label;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-skip focus:inline-flex focus:h-11 focus:items-center focus:rounded-pill focus:bg-amber focus:px-5 focus:text-small focus:font-semibold focus:text-void"
      >
        {copy.a11y.skipLink}
      </a>
      <header
        ref={headerRef}
        data-print="hide"
        data-scrolled="false"
        className={cn(
          'group/header fixed inset-x-0 top-0 z-header h-(--header-h) border-b border-transparent transition-[background-color,border-color] duration-hover ease-standard',
          'data-[scrolled=false]:bg-linear-to-b data-[scrolled=false]:from-void/85 data-[scrolled=false]:to-transparent',
          'data-[scrolled=true]:border-hairline data-[scrolled=true]:bg-void/90 sm:data-[scrolled=true]:backdrop-blur-[14px]',
        )}
      >
        <Container size="wide" className="flex h-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <SectionLink to="top" aria-label={copy.header.homeLabel} className="flex shrink-0 items-center gap-3 rounded-clip">
              <Monogram photo={profile.photo?.avatar} />
              <span aria-hidden="true" className="hidden whitespace-nowrap text-small font-semibold uppercase wdth-125 text-paper sm:inline">
                {profile.name}
              </span>
            </SectionLink>
            <span className="hidden whitespace-nowrap text-small text-smoke 2xl:inline">{profile.role}</span>
          </div>

          <nav aria-label={copy.header.navLabel} className="hidden lg:block">
            <ul ref={navListRef} className="relative flex items-center">
              {DESKTOP_NAV.map((s) => (
                <li key={s.id}>
                  <SectionLink
                    to={s.id}
                    data-section={s.id}
                    aria-current={active === s.id ? 'location' : undefined}
                    className="inline-flex h-11 items-center whitespace-nowrap px-3 text-small font-medium text-smoke transition-colors hover:text-paper aria-[current=location]:text-paper"
                  >
                    {s.label}
                  </SectionLink>
                </li>
              ))}
              <span
                ref={playheadRef}
                aria-hidden="true"
                style={{ opacity: 0 }}
                className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-amber transition-[transform,opacity] duration-hover ease-standard [transform:translateX(var(--x,0px))_scaleX(var(--w,0))]"
              />
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Short HUD: 380–1023. Below 640 the Rec chip already shows a dot, and the room is needed. */}
            <span
              ref={(el) => { hudRefs.current[0] = el; }}
              aria-hidden="true"
              data-scrolling="false"
              className="hidden items-center gap-2 text-ash transition-colors duration-quick data-[scrolling=true]:text-amber xs:flex lg:hidden"
            >
              <RecDot className="max-sm:hidden" />
              <span ref={(el) => { tcRefs.current[0] = el; }} className="tc tc-fixed max-sm:text-[0.75rem]">{ZERO}</span>
            </span>

            {/* Desktop HUD: ≥1280 */}
            <span
              ref={(el) => { hudRefs.current[1] = el; }}
              aria-hidden="true"
              data-scrolling="false"
              className="hidden items-center gap-1.5 whitespace-nowrap micro-caps text-ash transition-colors duration-quick data-[scrolling=true]:text-amber xl:flex"
            >
              <span>{copy.sequence.short}</span>
              <span>·</span>
              <span ref={(el) => { tcRefs.current[1] = el; }} className="tc tc-fixed">{ZERO}</span>
              <span>·</span>
              <span className="text-smoke">{activeLabel}</span>
            </span>

            <MotionToggle variant="chip" className="hidden lg:inline-flex" />
            <SectionLink
              to="contact"
              aria-current={active === 'contact' ? 'location' : undefined}
              className="group/btn relative hidden h-8 select-none items-center justify-center gap-2 whitespace-nowrap rounded-button border border-edge px-3 text-small font-semibold tracking-[0.01em] text-paper transition-[background-color,border-color,color,transform] duration-hover ease-standard hover:border-paper hover:bg-panel active:scale-[0.98] aria-[current=location]:border-amber lg:inline-flex"
            >
              {copy.header.contact}
            </SectionLink>

            <SiteHeaderMenu active={active} />
          </div>
        </Container>

        {/* Scrub bar along the bottom edge */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5">
          {SECTIONS.map((s, i) => (
            <span
              key={s.id}
              ref={(el) => { tickRefs.current[i] = el; }}
              className="absolute bottom-0 h-full w-px bg-rule"
            />
          ))}
          <m.div style={{ scaleX: scrollYProgress }} className="absolute inset-0 origin-left bg-amber" />
        </div>
      </header>
    </>
  );
}
