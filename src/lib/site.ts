function normalise(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
}
const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
export const SITE_URL = fromEnv ? normalise(fromEnv) : vercel ? normalise(vercel) : 'http://localhost:3000';
export function absoluteUrl(path = '/'): string { return new URL(path, `${SITE_URL}/`).toString(); }
