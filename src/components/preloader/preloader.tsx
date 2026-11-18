'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { profile } from '@/content/profile';
import { PRELOADER_SEEN_KEY } from '@/lib/motion-boot';
import './preloader.css';

gsap.registerPlugin(useGSAP);

type Mode = 'full' | 'short';

declare global {
  interface Window {
    /** Set by the boot script before first paint; null once the preloader has finished. */
    __anPreloader?: Mode | null;
    /** The boot script's failsafe timer; cleared as soon as this component takes over. */
    __anPreloaderTimer?: number;
  }
}

const SLATS = 7;
const FPS = 25;
const COUNT = 0.48; // seconds per countdown number
const COUNTDOWN = ['3', '2', '1'];
/** The component's own hard cap once it owns the exit (covers hidden tabs, stalls). */
const CAP_MS = 8000;
/** On a first visit, if hydration lands this late, start the countdown at "1". */
const LATE_MS = 1600;

const pad = (n: number) => String(n).padStart(2, '0');
function timecode(frames: number): string {
  const f = Math.max(0, Math.floor(frames));
  const s = Math.floor(f / FPS);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f % FPS)}`;
}

/** Unlocks the page: removes html[data-preloader] and tells Lenis and the 3D reel to start. */
function finish(): void {
  const html = document.documentElement;
  window.__anPreloader = null;
  try { sessionStorage.setItem(PRELOADER_SEEN_KEY, '1'); } catch { /* private mode */ }
  html.removeAttribute('data-preloader-reveal');
  if (html.hasAttribute('data-preloader')) {
    html.removeAttribute('data-preloader');
    window.dispatchEvent(new Event('preloader:done'));
  }
}

/**
 * The hand-off: the header drops in, the hero name wipes on, the rest of the hero rises.
 * Called through context.ignore(), so these tweens are not owned by the preloader's GSAP
 * context and survive its revert.
 */
function heroIntro(): void {
  if (!document.documentElement.hasAttribute('data-preloader')) return; // page already released
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const header = document.querySelector('header');
  if (header) tl.from(header, { yPercent: -100, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.1);
  const hero = document.getElementById('top');
  if (!hero) return;
  const name = hero.querySelector('[data-intro="name"]');
  const rest = hero.querySelectorAll('[data-intro]:not([data-intro="name"])');
  if (name) {
    tl.fromTo(
      name,
      { clipPath: 'inset(-10% 100% -10% 0%)' },
      { clipPath: 'inset(-10% 0% -10% 0%)', duration: 1.15, ease: 'expo.inOut', clearProps: 'clipPath' },
      0,
    );
  }
  if (rest.length) tl.from(rest, { y: 36, opacity: 0, duration: 1.1, stagger: 0.07, clearProps: 'transform,opacity' }, 0.18);
}

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    (context) => {
      const html = document.documentElement;
      const mode = (html.dataset.preloader ?? window.__anPreloader ?? undefined) as Mode | undefined;
      if (mode !== 'full' && mode !== 'short') {
        setDone(true);
        return;
      }

      // The component has taken over; the boot failsafe now only gets in the way.
      window.clearTimeout(window.__anPreloaderTimer);

      // Never play the intro to a background tab: release the page straight away.
      if (document.visibilityState === 'hidden') {
        finish();
        setDone(true);
        return;
      }

      // Dev Strict Mode can strip <html> attributes on remount; restore it from the boot global.
      if (!html.dataset.preloader) html.dataset.preloader = mode;

      const q = gsap.utils.selector(root);
      const one = (sel: string) => q(sel)[0] as HTMLElement;
      const stage = one('.pl-stage');
      const gate = one('.pl-gate');
      const inner = one('.pl-gate-inner');
      const leader = one('.pl-leader');
      const card = one('.pl-card');
      const take = one('.pl-take');
      const role = one('.pl-role');
      const flash = one('.pl-flash');
      const track = one('.pl-track');
      const tcEl = one('.pl-tc');
      const pctEl = one('.pl-pct-num');
      const pctLabel = one('.pl-pct-label');
      const nums = q('.pl-num');
      const chars = q('.pl-ch');
      const slats = q('.pl-slat');

      // ── Real readiness: window load + web fonts ──────────────────────────────────
      let isReady = false;
      const loaded =
        document.readyState === 'complete'
          ? Promise.resolve()
          : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
      const ready = Promise.all([loaded, document.fonts?.ready]).then(() => {
        isReady = true;
      });

      // ── Timecode + load meter, drawn from one object the timeline tweens ─────────
      const meter = { f: 0, p: 0 };
      let lastF = -1;
      let lastP = -1;
      const draw = () => {
        const f = Math.floor(meter.f);
        const p = Math.round(meter.p);
        if (f !== lastF) { tcEl.textContent = timecode(f); lastF = f; }
        if (p !== lastP) { pctEl.textContent = String(p).padStart(3, '0'); lastP = p; }
        track.style.setProperty('--p', (meter.p / 100).toFixed(4));
      };

      // ── Ambient film life: gate weave, flicker, chromatic fringe, light leak, sprockets ──
      const ambient: gsap.core.Animation[] = [
        gsap.to(inner, { x: 'random(-1.6, 1.6)', y: 'random(-1.2, 1.2)', duration: 0.07, ease: 'none', repeat: -1, repeatRefresh: true }),
        gsap.to(gate, { opacity: 'random(0.86, 1)', duration: 0.05, ease: 'none', repeat: -1, repeatRefresh: true }),
        // Stepped, so the fringed digits repaint ~11 times a second rather than every frame.
        gsap.to(nums, { '--ab': 'random(0.008, 0.042)', duration: 0.09, ease: 'steps(1)', repeat: -1, repeatRefresh: true }),
        gsap.to(q('.pl-leak'), { opacity: 'random(0.25, 1)', x: 'random(-40, 40)', duration: 0.5, ease: 'sine.inOut', repeat: -1, repeatRefresh: true }),
        gsap.fromTo(q('.pl-sprockets'), { '--sy': '0px' }, { '--sy': '6400px', duration: 8, ease: 'power2.in' }),
        gsap.to(q('.pl-rings'), { rotate: 360, duration: 20, ease: 'none', repeat: -1, transformOrigin: '50% 50%' }),
      ];

      let finished = false;
      let holdBuffer: gsap.core.Tween | undefined;
      const tl = gsap.timeline({ onUpdate: draw, defaults: { ease: 'expo.out' } });

      const hurry = () => { if (!finished) tl.timeScale(2.5); };
      const skip = () => {
        if (finished) return;
        if (tl.time() < tl.labels.cut) tl.seek('cut');
        tl.timeScale(1.4).play();
      };
      const end = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(capTimer);
        window.removeEventListener('pointerdown', hurry);
        window.removeEventListener('keydown', skip);
        holdBuffer?.kill();
        ambient.forEach((a) => a.kill());
        tl.kill();
        finish();
        setDone(true);
      };
      const capTimer = window.setTimeout(end, CAP_MS);

      let holdAt = 0.01;
      let cut: number;
      if (mode === 'full') {
        // Start states for the name card, so nothing flashes before its tween begins.
        gsap.set(chars, { yPercent: 118, opacity: 0, '--w': 62 });
        gsap.set(take, { opacity: 0, y: 8 });

        // ── Countdown: 3 → 2 → 1, one full sweep each ─────────────────────────────
        nums.forEach((el, i) => {
          const at = i * COUNT;
          tl.fromTo(leader, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: COUNT, ease: 'none', immediateRender: false }, at);
          tl.fromTo(gate, { scale: 1.022 }, { scale: 1, duration: 0.24, ease: 'power3.out', immediateRender: false }, at);
          if (i === 0) tl.fromTo(el, { scale: 1.12 }, { scale: 1, duration: 0.4 }, at);
          else tl.fromTo(el, { opacity: 0, scale: 1.55, filter: 'blur(16px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.3, immediateRender: false }, at);
          if (i < nums.length - 1) tl.to(el, { opacity: 0, scale: 0.86, duration: 0.07, ease: 'power2.in' }, at + COUNT - 0.07);
        });
        holdAt = nums.length * COUNT;
        tl.to(meter, { f: holdAt * FPS, duration: holdAt, ease: 'none' }, 0);
        tl.to(meter, { p: 86, duration: holdAt, ease: 'power1.inOut' }, 0);

        // ── 2-pop flash, then the name card ───────────────────────────────────────
        const pop = holdAt + 0.001;
        tl.set(leader, { autoAlpha: 0 }, pop)
          .fromTo(flash, { opacity: 0.95 }, { opacity: 0, duration: 0.2, ease: 'power2.out', immediateRender: false }, pop)
          .fromTo(gate, { scale: 1.05 }, { scale: 1, duration: 0.7, immediateRender: false }, pop)
          .set(card, { autoAlpha: 1 }, pop)
          .to(chars, { yPercent: 0, opacity: 1, '--w': 125, duration: 0.8, stagger: 0.045 }, pop + 0.03)
          .to(take, { opacity: 1, y: 0, duration: 0.5 }, pop + 0.12)
          .to(role, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.inOut' }, pop + 0.2)
          .to(meter, { p: 100, f: '+=15', duration: 0.6, ease: 'power2.out' }, pop)
          .call(() => { pctLabel.textContent = 'Ready'; }, undefined, pop + 0.5);
        cut = pop + 0.85;
      } else {
        // Short cut: the name card is already the first frame (CSS); fill the meter and cut.
        tl.to(meter, { p: 100, f: 8, duration: 0.3, ease: 'power2.out' }, 0)
          .call(() => { pctLabel.textContent = 'Ready'; }, undefined, 0.3);
        cut = 0.35;
      }

      // ── Hold until the page is really ready (2.5s cap) ──────────────────────────
      tl.addPause(holdAt, () => {
        if (isReady) { tl.resume(); return; }
        holdBuffer = gsap.fromTo(leader, { '--sweep': '0deg' }, { '--sweep': '360deg', duration: COUNT, ease: 'none', repeat: -1 });
        let resumed = false;
        const resume = () => {
          if (resumed || finished) return;
          resumed = true;
          capHold.kill();
          holdBuffer?.kill();
          tl.resume();
        };
        const capHold = gsap.delayedCall(2.5, resume);
        void ready.then(resume);
      });

      // ── The cut: RGB glitch, stage blows out, slats fly apart, hero takes over ──
      tl.addLabel('cut', cut)
        .to(card, { '--ab': 0.16, duration: 0.05, ease: 'none' }, 'cut')
        .to(card, { x: 'random(-18, 18)', skewX: 'random(-12, 12)', duration: 0.045, ease: 'none', repeat: 3, yoyo: true, repeatRefresh: true }, 'cut')
        .set(card, { x: 0, skewX: 0, '--ab': 0 }, 'cut+=0.2')
        .set(slats, { '--edge': 1 }, 'cut+=0.12')
        .to(stage, { scale: 1.08, opacity: 0, duration: 0.36, ease: 'power3.in' }, 'cut+=0.1')
        .to(
          slats,
          { xPercent: (i: number) => (i % 2 === 0 ? -102 : 102), duration: 0.95, ease: 'expo.inOut', stagger: { each: 0.045, from: 'center' } },
          'cut+=0.18',
        )
        // Reveal the page under the still-closed slats and start the hero hand-off in the same tick.
        .call(
          () => {
            html.setAttribute('data-preloader-reveal', '');
            context.ignore(heroIntro);
          },
          undefined,
          'cut+=0.16',
        )
        .call(end);

      // Hydrated late on a first visit? Skip ahead to "1" rather than making people wait.
      if (mode === 'full' && performance.now() > LATE_MS) tl.seek((nums.length - 1) * COUNT);

      // A click plays the rest at 2.5×; any key jumps straight to the cut.
      window.addEventListener('pointerdown', hurry, { once: true });
      window.addEventListener('keydown', skip, { once: true });

      return () => {
        window.clearTimeout(capTimer);
        window.removeEventListener('pointerdown', hurry);
        window.removeEventListener('keydown', skip);
      };
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div ref={root} className="pl">
      <p className="pl-sr" role="status">{`Loading ${profile.name}’s portfolio`}</p>

      <div className="pl-slats" aria-hidden="true">
        {Array.from({ length: SLATS }, (_, i) => (
          <div key={i} className="pl-slat" style={{ '--i': i, '--n': SLATS } as CSSProperties} />
        ))}
      </div>

      <div className="pl-stage" aria-hidden="true">
        <div className="pl-grain" />
        <div className="pl-leak" />
        <div className="pl-sprockets pl-sprockets--l" />
        <div className="pl-sprockets pl-sprockets--r" />

        <div className="pl-frame">
          <div className="pl-gate">
            <div className="pl-gate-inner">
              <div className="pl-scan" />
              <div className="pl-cross" />
              <span className="pl-corner pl-corner--tl" />
              <span className="pl-corner pl-corner--tr" />
              <span className="pl-corner pl-corner--bl" />
              <span className="pl-corner pl-corner--br" />

              <div className="pl-leader">
                <div className="pl-sweep" />
                <svg className="pl-rings" viewBox="0 0 100 100" focusable="false">
                  <circle cx="50" cy="50" r="46" />
                  <circle cx="50" cy="50" r="37" />
                  <circle className="pl-ticks" cx="50" cy="50" r="48.6" strokeDasharray="0.35 4.74" />
                </svg>
                <div className="pl-hand" />
                <div className="pl-counts">
                  {COUNTDOWN.map((n) => (
                    <span key={n} className="pl-num">{n}</span>
                  ))}
                </div>
              </div>

              <div className="pl-card">
                <p className="pl-take">Take 01 · {profile.location.display}</p>
                <p className="pl-name">
                  {Array.from(profile.name).map((ch, i) =>
                    ch === ' ' ? <span key={i} className="pl-sp" /> : <span key={i} className="pl-ch">{ch}</span>,
                  )}
                </p>
                <p className="pl-role">{profile.role}</p>
              </div>

              <div className="pl-flash" />
            </div>
          </div>
        </div>

        <div className="pl-vignette" />

        <div className="pl-hud pl-hud--top">
          <span className="pl-hud-group">
            <span className="pl-rec"><i className="pl-rec-dot" />Rec</span>
            <span className="pl-hide-sm">Seq 01 · Leader</span>
          </span>
          <span className="pl-hud-group">
            <span className="pl-hide-sm">{profile.name} · Portfolio</span>
            <span>25p</span>
          </span>
        </div>
        <div className="pl-hud pl-hud--bottom">
          <span className="pl-tc">00:00:00:00</span>
          <div className="pl-track">
            <div className="pl-fill" />
            <div className="pl-head" />
          </div>
          <span className="pl-pct">
            <span className="pl-pct-label">Loading</span>
            <span className="pl-pct-num">000</span>%
          </span>
        </div>
      </div>
    </div>
  );
}
