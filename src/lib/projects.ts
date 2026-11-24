import { profile, type Project } from '@/content/profile';
import type { GalleryProject } from '@/components/work/project-card';
import { sortCategories } from './categories';
import { publicFileExists } from './photo';

/** Server only: projects from portfolio.json, each marked with whether its poster file really exists. */
export function galleryProjects(list: readonly Project[] = profile.projects): GalleryProject[] {
  return list.map((p) => {
    const poster = p.video ? p.video.poster : p.image?.src;
    return { ...p, posterOk: poster ? publicFileExists(poster) : false };
  });
}

/** Category names in "projectCategoryOrder" order, for example ["Real-Time Video", "2D Motion"]. */
export function projectCategories(list: readonly Project[] = profile.projects): string[] {
  return sortCategories([...new Set(list.map((p) => p.category))]);
}
