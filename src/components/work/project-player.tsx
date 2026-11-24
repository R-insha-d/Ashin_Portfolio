'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { profile } from '@/content/profile';
import { toolNames } from '@/lib/content';
import { Chip } from '@/components/ui/chip';
import type { GalleryProject } from './project-card';

const w = profile.copy.work;

type ProjectPlayerProps = {
  projects: readonly GalleryProject[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Full-screen player for one project, with previous / next through the current list. */
export function ProjectPlayer({ projects, index, onIndexChange }: ProjectPlayerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const project = index === null ? null : projects[index] ?? null;
  const count = projects.length;

  // Open / close the native modal dialog with the selection.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
  }, [project]);

  const go = (delta: number) => {
    if (index === null || count < 2) return;
    onIndexChange((index + delta + count) % count);
  };

  const meta: Array<[string, string]> = [];
  if (project) {
    meta.push([w.categoryLabel, project.category]);
    if (project.video?.duration) meta.push([w.durationLabel, project.video.duration]);
    if (project.role) meta.push([w.roleLabel, project.role]);
    if (project.client) meta.push([w.clientLabel, project.client]);
    if (project.year) meta.push([w.yearLabel, String(project.year)]);
  }
  const tools = project ? toolNames(project.tools) : [];
  const vertical = project?.video ? project.video.height > project.video.width : false;

  return (
    <dialog
      ref={dialogRef}
      data-lenis-prevent
      aria-label={project ? `${w.playerLabel}: ${project.title}` : w.playerLabel}
      onClose={() => onIndexChange(null)}
      onCancel={() => onIndexChange(null)}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLVideoElement) return; // arrows seek the video when it has focus
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onIndexChange(null); }}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-void/95 p-0 text-paper opacity-100 transition-opacity duration-300 ease-standard backdrop:bg-void/80 backdrop:backdrop-blur-sm starting:open:opacity-0"
    >
      {project ? (
        <div className="mx-auto flex min-h-full w-full max-w-wide flex-col gap-4 px-(--gutter) py-4 lg:py-6">
          {/* Top bar */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="micro-caps flex items-center gap-2 text-ash">
                <span className="size-1.5 rounded-full bg-rec" aria-hidden="true" />
                <span className="tc">{pad2(index! + 1)} / {pad2(count)}</span>
                <span aria-hidden="true">·</span>
                {project.category}
              </p>
              {/* Names are not shown on screen; kept for screen readers. */}
              <h2 className="sr-only">{project.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => onIndexChange(null)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-edge text-paper transition-colors hover:border-paper hover:bg-panel"
              aria-label={w.close}
            >
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Stage */}
          <div className="relative flex flex-1 items-center justify-center gap-3">
            {count > 1 ? (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={w.previous}
                className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-edge text-paper transition-colors hover:border-amber hover:text-amber md:inline-flex"
              >
                <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ) : null}

            <div
              className="relative overflow-hidden rounded-panel border border-hairline bg-black shadow-panel"
              style={{
                aspectRatio: project.video ? `${project.video.width} / ${project.video.height}` : undefined,
                height: vertical ? '72dvh' : undefined,
                width: vertical ? 'auto' : 'min(100%, 72dvh * 16 / 9)',
                maxWidth: '100%',
              }}
            >
              {project.video ? (
                <video
                  key={project.id}
                  src={project.video.src}
                  poster={project.posterOk ? project.video.poster : undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="h-full w-full bg-black object-contain"
                />
              ) : project.image ? (
                <Image src={project.image.src} alt={project.image.alt} width={1600} height={2000} className="h-auto w-full" />
              ) : null}
            </div>

            {count > 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={w.next}
                className="hidden size-12 shrink-0 items-center justify-center rounded-full border border-edge text-paper transition-colors hover:border-amber hover:text-amber md:inline-flex"
              >
                <ChevronRight size={22} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* Details + mobile prev/next */}
          <div className="flex flex-col gap-4 border-t border-hairline pt-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-3">
              <dl className="flex flex-wrap gap-x-6 gap-y-2">
                {meta.map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-2">
                    <dt className="label-caps text-ash">{k}</dt>
                    <dd className="text-small text-paper">{v}</dd>
                  </div>
                ))}
              </dl>
              {tools.length > 0 ? (
                <ul aria-label={w.toolsLabel} className="flex flex-wrap gap-2">
                  {tools.map((t) => (
                    <Chip key={t} as="li" variant="tag">{t}</Chip>
                  ))}
                </ul>
              ) : null}
              {project.summary ? <p className="max-w-measure text-body text-smoke">{project.summary}</p> : null}
            </div>
            {count > 1 ? (
              <div className="flex gap-3 md:hidden">
                <button type="button" onClick={() => go(-1)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-button border border-edge text-small font-semibold">
                  <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                  {w.previous}
                </button>
                <button type="button" onClick={() => go(1)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-button border border-edge text-small font-semibold">
                  {w.next}
                  <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
