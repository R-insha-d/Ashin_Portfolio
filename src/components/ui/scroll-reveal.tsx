'use client';

import { useEffect, useRef } from 'react';
import { useMotionPaused } from '@/lib/motion-pref';
import './scroll-reveal.css';

/** Longest reveal transition in scroll-reveal.css, in ms. */
const DURATION_MS = 1100;
const COUNT_MS = 1400;
/** Variants whose waiting state has no visible area (clipped shut or scaled to zero width). */
const ZERO_AREA = new Set(['gate', 'wipe', 'mask', 'draw']);

function setState(el: HTMLElement, state: 'wait' | 'in' | 'done' | null) {
  if (state) el.dataset.rvState = state;
  else delete el.dataset.rvState;
}

/** The [data-rv] elements a trigger reveals: its own [data-rv] descendants (not a nested group's), or itself. */
function membersOf(trigger: HTMLElement): HTMLElement[] {
  if (!trigger.hasAttribute('data-rv-group')) return [trigger];
  const all = [...trigger.querySelectorAll<HTMLElement>('[data-rv]')];
  const own = all.filter((el) => el.parentElement?.closest('[data-rv-group]') === trigger);
  if (trigger.hasAttribute('data-rv')) own.unshift(trigger);
  return own;
}

/**
 * What to observe for a trigger. IntersectionObserver ignores a target that its own clip-path or
 * zero width hides, so a trigger in a zero-area variant is observed through its parent.
 */
function observedFor(trigger: HTMLElement): Element {
  const variant = trigger.dataset.rv;
  return variant && ZERO_AREA.has(variant) && trigger.parentElement ? trigger.parentElement : trigger;
}

/** Splits "2+ years" into its first number and the text around it. */
function parseCount(text: string) {
  const m = text.match(/\d+/);
  if (!m || m.index === undefined) return null;
  return { before: text.slice(0, m.index), target: Number(m[0]), width: m[0].length, after: text.slice(m.index + m[0].length) };
}

/** The text node holding the number. Writing to it (not textContent) keeps React's own node. */
function countNode(el: HTMLElement): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (/\d/.test(n.nodeValue ?? '')) return n as Text;
  }
  return null;
}

/**
 * Count-up targets of a member: itself and nested [data-rv-count] leaves whose nearest [data-rv]
 * (self included) is this member, so a number is never handled by two members.
 */
function countTargets(member: HTMLElement): HTMLElement[] {
  const all = member.hasAttribute('data-rv-count')
    ? [member, ...member.querySelectorAll<HTMLElement>('[data-rv-count]')]
    : [...member.querySelectorAll<HTMLElement>('[data-rv-count]')];
  return all.filter((el) => el.closest('[data-rv]') === member);
}

/** Shows the number as zero while the element waits (e.g. "0+ years", "00"). Idempotent. */
function zeroCount(el: HTMLElement) {
  const node = countNode(el);
  if (!node) return;
  if (el.dataset.rvFinal === undefined) el.dataset.rvFinal = node.nodeValue ?? '';
  const p = parseCount(el.dataset.rvFinal);
  if (p) node.nodeValue = p.before + '0'.padStart(p.width, '0') + p.after;
}

function restoreCount(el: HTMLElement) {
  const node = countNode(el);
  if (node && el.dataset.rvFinal !== undefined) node.nodeValue = el.dataset.rvFinal;
}

/** Counts the first number up from 0 to its final value, starting after `delayMs`. */
function countUp(el: HTMLElement, delayMs: number) {
  const node = countNode(el);
  const final = el.dataset.rvFinal;
  const p = final !== undefined ? parseCount(final) : null;
  if (!node || !p || final === undefined) return;
  const start = performance.now() + delayMs;
  const tick = (now: number) => {
    const t = Math.max(0, Math.min(1, (now - start) / COUNT_MS));
    const eased = 1 - Math.pow(1 - t, 3);
    node.nodeValue = p.before + String(Math.round(p.target * eased)).padStart(p.width, '0') + p.after;
    if (t < 1) requestAnimationFrame(tick);
    else node.nodeValue = final;
  };
  requestAnimationFrame(tick);
}

/**
 * Entrance animations for every section of the page (see scroll-reveal.css for the variants).
 * Only content that is below the fold when the page loads is armed (hidden), so server HTML,
 * crawlers, no-JS visitors and the first screen are never hidden. Plays once per element, even
 * across Standby toggles. Off while motion is paused (Standby toggle or prefers-reduced-motion).
 * Place it inside the container to animate (e.g. <main>): it works on its parent element, so a
 * hidden, still-mounted previous page (Next keeps recent routes in the DOM) is never touched.
 */
export function ScrollReveal() {
  const paused = useMotionPaused();
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;
    const timers: number[] = [];

    const release = (el: HTMLElement) => {
      for (const c of countTargets(el)) restoreCount(c);
      setState(el, null);
    };

    if (paused) {
      // Show anything still waiting (e.g. Standby switched on mid-page), with its real numbers.
      root.querySelectorAll<HTMLElement>('[data-rv-state]').forEach(release);
      return;
    }

    // Triggers: groups, plus [data-rv] elements that are not inside a group.
    const groups = [...root.querySelectorAll<HTMLElement>('[data-rv-group]')];
    const loose = [...root.querySelectorAll<HTMLElement>('[data-rv]')].filter(
      (el) => !el.hasAttribute('data-rv-group') && !el.parentElement?.closest('[data-rv-group]'),
    );

    const reveal = (members: HTMLElement[]) => {
      for (const el of members) {
        if (el.dataset.rvState !== 'wait') continue;
        const delay = Number(el.dataset.rvT) || 0;
        setState(el, 'in');
        el.dataset.rvPlayed = '';
        for (const c of countTargets(el)) countUp(c, delay);
        timers.push(window.setTimeout(() => setState(el, 'done'), DURATION_MS + delay + 80));
      }
    };

    // One observed element can stand in for several triggers (siblings sharing a parent).
    const watch = new Map<Element, HTMLElement[]>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          for (const trigger of watch.get(e.target) ?? []) reveal(membersOf(trigger));
          watch.delete(e.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    const fold = window.innerHeight * 0.92;
    for (const trigger of [...groups, ...loose]) {
      const members = membersOf(trigger).filter((el) => !el.dataset.rvState && !('rvPlayed' in el.dataset));
      if (members.length === 0) continue;
      // Already on screen at load: leave it alone (no flash, nothing hidden).
      if (trigger.getBoundingClientRect().top < fold) continue;
      const rawStep = trigger.dataset.rvStep;
      const step = rawStep !== undefined && rawStep !== '' && Number.isFinite(Number(rawStep)) ? Number(rawStep) : 80;
      members.forEach((el, i) => {
        const extra = Number(el.dataset.rvDelay) || 0;
        el.style.setProperty('--rv-i', String(i));
        el.style.setProperty('--rv-step', `${step}ms`);
        if (extra) el.style.setProperty('--rv-delay', `${extra}ms`);
        el.dataset.rvT = String(i * step + extra); // total delay, for the count-up and the clean-up
        for (const c of countTargets(el)) zeroCount(c);
        setState(el, 'wait');
      });
      const target = observedFor(trigger);
      watch.set(target, [...(watch.get(target) ?? []), trigger]);
      io.observe(target);
    }

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      // Un-arm whatever has not played yet, and finish what is playing, so a re-run of this
      // effect (dev Strict Mode, Fast Refresh, Standby toggled) starts from a clean slate.
      root.querySelectorAll<HTMLElement>('[data-rv-state]').forEach((el) => {
        if (el.dataset.rvState === 'wait') release(el);
        else if (el.dataset.rvState === 'in') setState(el, 'done');
      });
    };
  }, [paused]);

  return <span ref={markerRef} hidden />;
}
