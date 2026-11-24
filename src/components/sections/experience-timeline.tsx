'use client';

import { useEffect, useRef } from 'react';
import { animate, m, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { profile, type YearSpan } from '@/content/profile';
import { Chip } from '@/components/ui/chip';
import { Waveform } from '@/components/ui/waveform';
import {
  BIN_ROLES,
  DATED_ROLES,
  DIPLOMA,
  RULER,
  RULER_YEARS,
  SEPARATOR,
  checkTimelineHonesty,
  speakYearSpan,
  spanToGridLines,
  toolNames,
} from '@/lib/content';
import { SPRING } from '@/lib/motion';
import { useMotionPaused } from '@/lib/motion-pref';
import { cue } from './experience-cue';
import { useSelectedRole } from './experience-stage';

const t = profile.copy.experience.timeline;
const binTrack = profile.copy.experience.edl.binTrack;
const RULER_LEN = RULER.to - RULER.from + 1;

/** Column 1 is the track header, so every span shifts by one grid line. */
function gridColumn(span: YearSpan): string {
  const { start, end } = spanToGridLines(span);
  return `${start + 1} / ${end + 1}`;
}

/**
 * Entrance choreography (scroll-reveal.css), in ms after the panel scrolls into view. The panel is
 * one reveal group with a 1 ms step, so these cues are the timing: the panel gate opens, the ruler
 * and the lanes draw on from the left, the clips are laid down like an edit (V2, then V1, then A1),
 * the bin follows, and the Huddle Global marker lands last.
 */
const CUE = {
  panel: 100,
  // The inner cues start once the panel's shutter is mostly open (its ease starts slowly).
  ruler: 550, // + 40 per year cell
  lane: 610, // + 60 per track
  clip: 730, // + 80 per clip
  bin: 710,
  binCard: 830, // + 80 per card
  playhead: 1110,
  marker: 1150, // the band; the diamond + 60, the label + 120
} as const;

/** A faint lane behind a track's clips; it draws on from the left with the ruler. */
function Lane({ row, delay }: { row: number; delay: number }) {
  return (
    <div
      aria-hidden="true"
      {...cue('draw', delay)}
      className="rounded-clip bg-track"
      style={{ gridColumn: '2 / -1', gridRow: row }}
    />
  );
}

const CLIP =
  'group/clip relative flex h-full min-h-11 min-w-0 flex-col justify-center gap-0.5 overflow-hidden rounded-clip border border-rule bg-raised px-3 py-2 transition-[transform,box-shadow] duration-hover hover:-translate-y-0.5 data-selected:bg-[image:linear-gradient(var(--color-amber-wash),var(--color-amber-wash))] data-selected:shadow-glow-amber';

const A1_CLIP =
  'group/clip relative flex h-full min-w-0 items-center overflow-hidden rounded-clip border border-rule bg-raised px-3 data-selected:bg-[image:linear-gradient(var(--color-amber-wash),var(--color-amber-wash))] data-selected:shadow-glow-amber';

function TrimHandles() {
  return (
    <>
      <span aria-hidden="true" className="absolute inset-y-1 left-0.5 w-[3px] rounded-full bg-amber opacity-0 transition-opacity duration-quick group-data-selected/clip:opacity-100" />
      <span aria-hidden="true" className="absolute inset-y-1 right-0.5 w-[3px] rounded-full bg-amber opacity-0 transition-opacity duration-quick group-data-selected/clip:opacity-100" />
    </>
  );
}

function TrackHeader({ code, name, row, delay }: { code: string; name: string; row: number; delay: number }) {
  return (
    <div {...cue('mask', delay)} className="label-caps flex items-center gap-2 pr-3 text-ash" style={{ gridColumn: '1 / 2', gridRow: row }}>
      <span className="text-paper">{code}</span>
      <span>{name}</span>
    </div>
  );
}

function Playhead({ panelRef }: { panelRef: React.RefObject<HTMLDivElement | null> }) {
  const paused = useMotionPaused();
  const selected = useSelectedRole();
  const { scrollYProgress } = useScroll({ target: panelRef, offset: ['start 75%', 'end 60%'] });
  const scrub = useSpring(scrollYProgress, SPRING.scrub);
  const pos = useMotionValue(1);
  const x = useTransform(pos, (v) => `${v * 100}%`);

  const dated = selected ? DATED_ROLES.find((r) => r.id === selected) : undefined;
  const isBin = selected !== null && BIN_ROLES.some((r) => r.id === selected);
  const target = dated ? (dated.dates.from - RULER.from) / RULER_LEN : null;

  useMotionValueEvent(scrub, 'change', (v) => {
    if (!paused && target === null) pos.set(v);
  });

  useEffect(() => {
    if (paused) {
      pos.set(1);
      return;
    }
    const controls = animate(pos, target ?? scrub.get(), SPRING.snap);
    return () => controls.stop();
  }, [paused, target, pos, scrub]);

  return (
    <div
      aria-hidden="true"
      {...cue('fade', CUE.playhead)}
      className="pointer-events-none relative z-raised"
      style={{ gridColumn: '2 / -1', gridRow: '2 / -1' }}
    >
      <m.div
        className="absolute inset-y-0 left-0 w-full transition-opacity duration-hover"
        style={{ x, opacity: isBin ? 0.3 : 1 }}
      >
        <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-amber" />
        <span
          className="absolute left-0 top-0 h-3 w-3 -translate-x-1/2 bg-amber"
          style={{ clipPath: 'polygon(0 0,100% 0,100% 60%,50% 100%,0 60%)' }}
        />
      </m.div>
    </div>
  );
}

function BinCard({ role }: { role: (typeof BIN_ROLES)[number] }) {
  const sub = [role.company ?? role.orgLabel, role.location].filter(Boolean).join(SEPARATOR);
  return (
    <a href={`#role-${role.id}`} data-role={role.id} className={CLIP}>
      <TrimHandles />
      <span className="flex items-center gap-2">
        <Chip variant="label">{binTrack}</Chip>
        <Chip variant="amber">
          <span aria-hidden="true">{role.duration.short}</span>
        </Chip>
      </span>
      <span className="mt-1 text-small font-semibold text-paper">{role.title}</span>
      <span className="micro-caps text-smoke">{sub}</span>
      <span className="sr-only">
        , {profile.copy.a11y.datesNotListed}, {role.duration.spoken}
      </span>
    </a>
  );
}

export function ExperienceTimeline() {
  const panelRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const problems = checkTimelineHonesty();
    if (problems.length) console.error('[experience] timeline honesty:', problems);
    else console.info('[experience] timeline honesty: ok');
    const leaked = BIN_ROLES.filter((r) => tracksRef.current?.querySelector(`[data-role="${r.id}"]`));
    if (leaked.length) console.error('[experience] undated roles rendered on the dated axis:', leaked.map((r) => r.id));
  }, []);

  let clips = 0;
  const nextClip = () => CUE.clip + clips++ * 80;
  const diplomaCue = nextClip();
  const v1Cues = DATED_ROLES.map(() => nextClip());
  const a1Cues = DATED_ROLES.map(() => nextClip());
  const marker = { from: profile.highlight.year, to: profile.highlight.year };

  return (
    // The reveal group is this unclipped wrapper: an observer never sees a target that its own
    // clip-path hides (the gate), so the panel cannot trigger itself.
    <div data-rv-group data-rv-step="1" className="hidden lg:block">
      <div
        ref={panelRef}
        {...cue('gate', CUE.panel)}
        // Shutter only (--rv-scale:1): a zoom settle would push this near full-width panel past the
        // viewport edge while it plays. --rv-radius matches the panel's own corners.
        className="overflow-hidden rounded-panel border border-hairline bg-panel shadow-panel [--rv-radius:var(--radius-panel)] [--rv-scale:1]"
      >
        <div aria-hidden="true" className="flex h-9 items-center border-b border-hairline px-3">
          <span className="micro-caps text-ash">{t.panelLabel}</span>
        </div>
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div
            ref={tracksRef}
            role="group"
            aria-label={t.groupLabel}
            // Track geometry per spec S5.2: 7.5rem header column, five year cells; fixed row heights.
            className="grid grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] grid-rows-[28px_32px_48px_minmax(72px,auto)_48px] gap-y-1.5"
          >
            {/* Marker row: the whole highlight-year cell */}
            <div className="relative" style={{ gridColumn: gridColumn(marker), gridRow: 1 }}>
              <span {...cue('mask', CUE.marker + 120)} className="micro-caps absolute right-1 top-0 whitespace-nowrap text-amber">{t.marker}</span>
              <span aria-hidden="true" {...cue('draw', CUE.marker)} className="absolute inset-x-0 bottom-0 h-2 border-t-2 border-amber bg-amber-wash" />
              <span aria-hidden="true" {...cue('pop', CUE.marker + 60)} className="absolute bottom-0.5 left-0 size-2 -translate-x-1/2 rotate-45 bg-amber" />
            </div>

            {/* Ruler */}
            <div aria-hidden="true" {...cue('fade', CUE.ruler)} className="micro-caps flex items-end pb-2 pr-3 text-ash" style={{ gridColumn: '1 / 2', gridRow: 2 }}>
              {t.rulerNote}
            </div>
            {RULER_YEARS.map((year, i) => (
              <div
                key={year}
                aria-hidden="true"
                {...cue('wipe', CUE.ruler + i * 40)}
                className="ruler-ticks micro-caps border-l border-rule pl-1.5 pt-1 text-ash"
                style={{ gridColumn: `${i + 2} / ${i + 3}`, gridRow: 2 }}
              >
                {year}
              </div>
            ))}

            {/* V2 · Training */}
            <TrackHeader code={t.trackCodes.v2} name={t.tracks.v2} row={3} delay={CUE.lane} />
            <Lane row={3} delay={CUE.lane} />
            <div {...cue('wipe', diplomaCue)} className="relative" style={{ gridColumn: gridColumn(DIPLOMA.dates), gridRow: 3 }}>
              <a href={`#edu-${DIPLOMA.id}`} className={CLIP}>
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-v2" />
                <TrimHandles />
                <span className="truncate text-small font-semibold text-paper">{DIPLOMA.qualification}</span>
                <span className="sr-only">, </span>
                <span className="micro-caps truncate text-smoke">
                  {[DIPLOMA.institution, DIPLOMA.place].filter(Boolean).join(SEPARATOR)}
                </span>
                <span className="sr-only">, {speakYearSpan(DIPLOMA.dates)}</span>
              </a>
            </div>

            {/* V1 · Roles (dated only; the 2022–2023 cells stay empty) */}
            <TrackHeader code={t.trackCodes.v1} name={t.tracks.v1} row={4} delay={CUE.lane + 60} />
            <Lane row={4} delay={CUE.lane + 60} />
            {DATED_ROLES.map((role, i) => (
              <div key={role.id} {...cue('wipe', v1Cues[i])} className="relative" style={{ gridColumn: gridColumn(role.dates), gridRow: 4 }}>
                <a href={`#role-${role.id}`} data-role={role.id} className={CLIP}>
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-v1" />
                  <TrimHandles />
                  <span className="text-small font-semibold text-paper">{role.title}</span>
                  <span className="sr-only">, </span>
                  <span className="micro-caps text-smoke">
                    {[role.orgLabel, role.location].filter(Boolean).join(SEPARATOR)}
                  </span>
                  <span className="mt-1">
                    <Chip variant="amber">
                      <span aria-hidden="true">{role.duration.short}</span>
                    </Chip>
                  </span>
                  <span className="sr-only">
                    , {speakYearSpan(role.dates)}, {role.duration.spoken}
                  </span>
                </a>
              </div>
            ))}

            {/* A1 · Tools */}
            <TrackHeader code={t.trackCodes.a1} name={t.tracks.a1} row={5} delay={CUE.lane + 120} />
            <Lane row={5} delay={CUE.lane + 120} />
            {DATED_ROLES.map((role, i) =>
              role.tools.length === 0 ? null : (
                <div key={role.id} {...cue('wipe', a1Cues[i])} className="relative" style={{ gridColumn: gridColumn(role.dates), gridRow: 5 }}>
                  <div data-role={role.id} className={A1_CLIP}>
                    <TrimHandles />
                    <Waveform seed={role.id} className="absolute inset-0 h-full w-full text-a1/35" />
                    <span className="micro-caps relative truncate text-paper">{toolNames(role.tools).join(SEPARATOR)}</span>
                  </div>
                </div>
              ),
            )}

            <Playhead panelRef={panelRef} />
          </div>

          {/* Bin: undated roles, never inside the ruler grid */}
          <div {...cue('fade', CUE.bin)} className="rounded-panel border border-hairline bg-track p-4">
            <p {...cue('mask', CUE.bin + 80)} className="micro-caps mb-3 text-smoke">{t.bin}</p>
            <ul className="flex flex-col gap-3">
              {BIN_ROLES.map((role, i) => (
                <li key={role.id} {...cue('rise', CUE.binCard + i * 80)}>
                  <BinCard role={role} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
