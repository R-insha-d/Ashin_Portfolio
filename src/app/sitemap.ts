// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { profile } from '@/content/profile';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  // No lastModified: no invented dates.
  const pages: MetadataRoute.Sitemap = [{ url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 }];
  if (profile.projects.length > 0) pages.push({ url: `${SITE_URL}/projects`, changeFrequency: 'monthly', priority: 0.8 });
  return pages;
}
