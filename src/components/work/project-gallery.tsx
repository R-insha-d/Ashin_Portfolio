'use client';

import { useState } from 'react';
import { profile } from '@/content/profile';
import { ProjectCard, type GalleryProject } from './project-card';
import { ProjectPlayer } from './project-player';

type ProjectGalleryProps = {
  projects: readonly GalleryProject[];
};

const w = profile.copy.work;

/**
 * Home page "Selects": the featured projects in one row of tall cards (two columns on phones).
 * 9:16 reels take one column and 16:9 films take three (see ProjectCard). Selecting a card opens
 * ProjectPlayer with sound. The full list lives on /projects (ProjectMosaic).
 */
export function ProjectGallery({ projects }: ProjectGalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  if (projects.length === 0) return null;

  return (
    <>
      {/* Scroll reveal: the cards open like gates, left to right (data-rv="gate" on each ProjectCard). */}
      <ul data-rv-group data-rv-step="120" className="grid grid-flow-row-dense grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            playLabel={w.play}
            sizes="(min-width:1024px) 25vw, 50vw"
            priority={i < 2}
            onOpen={() => setOpen(i)}
          />
        ))}
      </ul>
      <ProjectPlayer projects={projects} index={open} onIndexChange={setOpen} />
    </>
  );
}
