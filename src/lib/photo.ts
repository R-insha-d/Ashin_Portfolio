import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Photo } from '@/content/profile';

export function publicFileExists(src: string): boolean {
  return existsSync(join(process.cwd(), 'public', src.replace(/^\/+/, '')));
}
/** Returns the photo only when its file really exists, so a typo never ships a broken image. */
export function resolvePhoto(photo: Photo | null): Photo | null {
  return photo && publicFileExists(photo.src) ? photo : null;
}
