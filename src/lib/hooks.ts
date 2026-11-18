import { useCallback, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** Media query state; `serverValue` is used for SSR and hydration. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
