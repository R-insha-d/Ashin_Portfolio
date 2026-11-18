'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { RoleId } from '@/content/profile';

/**
 * Linked selection for the Experience section. Hovering or focusing any element carrying
 * `data-role` selects that role: every element with the same `data-role` gets `data-selected`
 * (written straight to the DOM, so server-rendered EDL rows highlight without re-rendering),
 * and the timeline playhead reads the id from context.
 */
const SelectionContext = createContext<RoleId | null>(null);

export function useSelectedRole(): RoleId | null {
  return useContext(SelectionContext);
}

function roleFrom(target: EventTarget | null): RoleId | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>('[data-role]');
  return (el?.dataset.role as RoleId | undefined) ?? null;
}

export function ExperienceStage({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<RoleId | null>(null);
  const [selected, setSelected] = useState<RoleId | null>(null);

  const select = useCallback((id: RoleId | null) => {
    if (currentRef.current === id) return;
    currentRef.current = id;
    const root = rootRef.current;
    if (root) {
      root.querySelectorAll<HTMLElement>('[data-selected]').forEach((el) => el.removeAttribute('data-selected'));
      if (id) root.querySelectorAll<HTMLElement>(`[data-role="${id}"]`).forEach((el) => el.setAttribute('data-selected', ''));
    }
    setSelected(id);
  }, []);

  return (
    <div
      ref={rootRef}
      onPointerOver={(e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') select(roleFrom(e.target));
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') select(roleFrom(document.activeElement));
      }}
      onFocus={(e) => select(roleFrom(e.target))}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) select(null);
      }}
    >
      <SelectionContext.Provider value={selected}>{children}</SelectionContext.Provider>
    </div>
  );
}
