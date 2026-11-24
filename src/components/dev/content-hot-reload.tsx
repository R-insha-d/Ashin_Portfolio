'use client';

import { useEffect, useRef } from 'react';
import { profile } from '@/content/profile';
import { DEV_RELOAD_KEY } from '@/lib/motion-boot';

/**
 * Development only. When src/content/portfolio.json is saved, Fast Refresh re-runs this module with
 * the new data, but Server Components keep their old output (Next's dev cache is not invalidated
 * by a JSON change). Seeing a new `profile` object here means the JSON changed, so reload the page:
 * every section then renders the new content. The intro preloader is skipped for that reload and
 * the browser keeps the scroll position.
 */
export function ContentHotReload() {
  const seen = useRef(profile);

  useEffect(() => {
    if (seen.current === profile) return;
    seen.current = profile;
    console.info('[content] portfolio.json changed: reloading the page');
    const timer = window.setTimeout(() => {
      try { sessionStorage.setItem(DEV_RELOAD_KEY, '1'); } catch { /* private mode: intro plays */ }
      window.location.reload();
    }, 300);
    return () => window.clearTimeout(timer);
  });

  return null;
}
