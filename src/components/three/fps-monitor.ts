/**
 * Tiny replacement for drei's PerformanceMonitor (S1.8).
 * Averages FPS over 250ms windows. Three slow windows in a row (< 40 fps) → `onDegrade` (drop DPR to 1).
 * Three more slow windows after that → `onGiveUp` (poster fallback). It never flips back.
 */
export interface FpsMonitorOptions {
  onDegrade: () => void;
  onGiveUp: () => void;
  threshold?: number;
  windowMs?: number;
  strikes?: number;
}

export class FpsMonitor {
  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly strikes: number;
  private windowStart = -1;
  private frames = 0;
  private slow = 0;
  private stage: 0 | 1 | 2 = 0;

  constructor(private readonly opts: FpsMonitorOptions) {
    this.threshold = opts.threshold ?? 40;
    this.windowMs = opts.windowMs ?? 250;
    this.strikes = opts.strikes ?? 3;
  }

  /** Call when the loop (re)starts after a pause, so idle time never counts as a slow window. */
  reset(): void {
    this.windowStart = -1;
    this.frames = 0;
    this.slow = 0;
  }

  /** Call once per rendered frame of a continuously running loop, with the rAF timestamp. */
  tick(now: number): void {
    if (this.stage === 2) return;
    if (this.windowStart < 0) { this.windowStart = now; this.frames = 0; return; }
    this.frames++;
    const elapsed = now - this.windowStart;
    if (elapsed < this.windowMs) return;
    // Ignore windows stretched by a stall (tab switch, debugger): they say nothing about steady fps.
    if (elapsed < this.windowMs * 4) {
      const fps = (this.frames * 1000) / elapsed;
      this.slow = fps < this.threshold ? this.slow + 1 : 0;
      if (this.slow >= this.strikes) {
        this.slow = 0;
        if (this.stage === 0) { this.stage = 1; this.opts.onDegrade(); }
        else { this.stage = 2; this.opts.onGiveUp(); }
      }
    }
    this.windowStart = now;
    this.frames = 0;
  }
}
