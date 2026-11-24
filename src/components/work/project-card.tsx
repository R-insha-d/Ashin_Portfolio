'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Project } from '@/content/profile';
import { Monogram } from '@/components/ui/monogram';
import { cn } from '@/lib/cn';
import { useMotionPaused } from '@/lib/motion-pref';

export type GalleryProject = Project & {
  /** Checked on the server: false when the poster file is missing, so the card shows a placeholder. */
  readonly posterOk: boolean;
};

type ProjectCardProps = {
  project: GalleryProject;
  playLabel: string;
  sizes: string;
  priority?: boolean;
  onOpen: () => void;
};

/** Width / height of the card's media: the video's own shape, or 4:5 for still projects. */
export function projectAspect(p: Project): number {
  return p.video ? p.video.width / p.video.height : 4 / 5;
}

export function ProjectCard({ project: p, playLabel, sizes, priority, onOpen }: ProjectCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const paused = useMotionPaused();
  const preview = p.video?.preview ?? null;
  const poster = p.video ? (p.posterOk ? p.video.poster : null) : p.image && p.posterOk ? p.image.src : null;
  const ar = projectAspect(p);

  const canPreview = () => {
    if (!preview || paused) return false;
    return document.documentElement.dataset.saveData !== 'true';
  };
  const start = () => {
    const v = videoRef.current;
    if (!v || !canPreview()) return;
    void v.play().catch(() => {});
  };
  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPreviewing(false);
  };

  // Touch screens have no hover: play the preview while the card is mostly on screen.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !preview || !window.matchMedia('(hover: none)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const v = videoRef.current;
        if (!v) return;
        if (entry.isIntersecting && !paused && document.documentElement.dataset.saveData !== 'true') void v.play().catch(() => {});
        else { v.pause(); setPreviewing(false); }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [preview, paused]);

  return (
    <li
      // Scroll reveal (home Selects row): a shutter opening, after the section heading.
      data-rv="gate"
      data-rv-delay="200"
      className={cn(
        // Gate: open with the card's own corner radius and a gentler zoom so neighbours never touch.
        'group/card min-w-0 [--rv-radius:var(--radius-panel)] [--rv-scale:1.03]',
        // A 16:9 card across 3 columns is almost exactly as tall as a 9:16 card in 1 column.
        ar >= 1 ? 'col-span-2 md:col-span-3' : 'col-span-1',
      )}
    >
      <button
        ref={cardRef}
        type="button"
        onClick={onOpen}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') start(); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') stop(); }}
        onFocus={start}
        onBlur={stop}
        aria-label={`${playLabel}: ${p.title} (${p.category}${p.video?.duration ? `, ${p.video.duration}` : ''})`}
        className="relative block h-full w-full cursor-pointer overflow-hidden rounded-panel border border-hairline bg-void text-left transition-[border-color,transform] duration-hover ease-standard hover:border-edge focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-[0.99] stby:transition-none"
        style={{ aspectRatio: `${ar}` }}
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-[1200ms] ease-rise group-hover/card:scale-[1.045] stby:transition-none stby:group-hover/card:scale-100"
          />
        ) : (
          <span aria-hidden="true" className="ebu-bars absolute inset-0 flex items-center justify-center">
            <Monogram />
          </span>
        )}

        {preview ? (
          <video
            ref={videoRef}
            src={preview}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
            onPlaying={() => setPreviewing(true)}
            data-on={previewing}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 data-[on=true]:opacity-100"
          />
        ) : null}

        {/* Legibility scrim + film-frame chrome */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-void/75 via-transparent via-30% to-void/25" />
        <span
          aria-hidden="true"
          className="absolute left-3 right-3 top-3 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-pill border border-paper/15 bg-void/60 px-2.5 py-1 micro-caps text-paper backdrop-blur-sm"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-amber" />
          <span className="truncate">{p.category}</span>
        </span>

        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full border border-amber/80 bg-void/50 text-amber opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-hover ease-standard group-hover/card:scale-100 group-hover/card:opacity-100 group-focus-within/card:scale-100 group-focus-within/card:opacity-100"
        >
          <Play size={22} strokeWidth={1.75} className="translate-x-px fill-current" />
        </span>

        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
          {p.video?.duration ? (
            <span className="tc flex items-center gap-1.5 text-[0.75rem] text-paper/80">
              <Play size={10} strokeWidth={2} className="fill-current text-amber" />
              {p.video.duration}
            </span>
          ) : null}
          {p.client || p.year ? (
            <span className="text-small text-smoke">{[p.client, p.year].filter(Boolean).join(' · ')}</span>
          ) : null}
        </span>

        <span
          aria-hidden="true"
          className="corner-brackets pointer-events-none absolute inset-0 rounded-panel opacity-0 transition-opacity duration-hover ease-standard group-hover/card:opacity-100 group-focus-within/card:opacity-100"
        />
      </button>
    </li>
  );
}
