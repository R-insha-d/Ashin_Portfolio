// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 }]; // no lastModified (no invented dates)
}
