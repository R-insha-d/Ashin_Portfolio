'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useRef } from 'react';
import { profile } from '@/content/profile';
import { cn } from '@/lib/cn';
import type { GalleryProject } from '../project-card';
import { OB_LABELS, pad2, posterOf, projectLabel, runtimeOf, aspectOf } from './orbit-shared';

const L = profile.copy.projectsPage.labels;

type OrbitRailProps = {
  projects: readonly GalleryProject[];
  onOpen: (index: number) => void;
  className?: string;
};

/**
 * The calm version of ORBIT (motion paused, or no WebGL): a film strip of posters that scrolls
 * sideways with native scrolling and snap points. No autoplay, no looping animation, no wheel capture.
 */
export function OrbitRail({ projects, onOpen, className }: OrbitRailProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const n = projects.length;

  const scrollBy = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'auto' });
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="mx-auto flex w-full max-w-wide items-center justify-between gap-4 px-(--gutter)">
        <p className="micro-caps flex flex-wrap items-center gap-x-3 gap-y-1 text-ash">
          <span aria-hidden="true" className="inline-block size-2 rounded-[1px] bg-ash" />
          <span>{OB_LABELS.roll}</span>
          <span aria-hidden="true" className="h-3 w-px bg-rule" />
          <span>
            <span className="tc text-paper">{pad2(n)}</span> {L.clips}
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-rule" />
          <span>
            {L.runtime} <span className="tc text-paper">{runtimeOf(projects)}</span>
          </span>
        </p>
        {n > 1 ? (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => scrollBy(-1)} aria-label={OB_LABELS.scrollBack} className="inline-flex size-11 items-center justify-center rounded-full border border-edge text-paper transition-colors hover:border-amber hover:text-amber">
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label={OB_LABELS.scrollOn} className="inline-flex size-11 items-center justify-center rounded-full border border-edge text-paper transition-colors hover:border-amber hover:text-amber">
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="ob-rail-frame">
        <ol ref={listRef} className="ob-rail" aria-label={OB_LABELS.index}>
          {projects.map((p, i) => {
            const poster = posterOf(p);
            const ar = aspectOf(p);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  data-rail-i={i}
                  onClick={() => onOpen(i)}
                  aria-label={projectLabel(p, i, n, L.playWithSound)}
                  className="group ob-rail-card relative block overflow-hidden rounded-[6px] bg-void text-left outline-offset-4"
                  style={{ ['--ar' as string]: String(ar) }}
                >
                  {poster ? (
                    <Image src={poster} alt="" fill sizes="(max-width: 48rem) 60vw, 30vw" loading={i < 3 ? 'eager' : 'lazy'} className="object-cover transition-[filter] duration-hover group-hover:brightness-110" />
                  ) : (
                    <span aria-hidden="true" className="ebu-bars absolute inset-x-0 bottom-[12%] h-[8%] opacity-60" />
                  )}
                  <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(11_11_12/0.88),transparent_45%),linear-gradient(to_bottom,rgb(11_11_12/0.6),transparent_25%)]" />
                  <span aria-hidden="true" className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                    <span className="tc text-paper">{pad2(i + 1)}</span>
                    <span className="micro-caps rounded-pill border border-hairline bg-void/70 px-2 py-1 text-paper">{p.category}</span>
                  </span>
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
                    <span className="micro-caps text-smoke">
                      {ar > 1 ? L.film : L.reel}
                      {p.video?.duration ? <> · <span className="tc text-paper">{p.video.duration}</span></> : null}
                    </span>
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-amber text-void transition-transform duration-hover group-hover:scale-105">
                      <Play size={16} strokeWidth={2} fill="currentColor" aria-hidden="true" />
                    </span>
                  </span>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[6px] border border-hairline group-hover:border-amber group-focus-visible:border-amber" />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
