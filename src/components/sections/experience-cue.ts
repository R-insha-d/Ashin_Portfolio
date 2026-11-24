/** Reveal variants from scroll-reveal.css. */
export type RevealVariant = 'rise' | 'focus' | 'card' | 'gate' | 'wipe' | 'mask' | 'draw' | 'pop' | 'fade';

/**
 * Scroll-reveal attributes for an element that enters at an exact cue (ms after its group scrolls
 * into view). Used inside groups with data-rv-step="1", where the cues are the choreography.
 */
export function cue(variant: RevealVariant, ms: number) {
  return { 'data-rv': variant, 'data-rv-delay': String(Math.round(ms)) };
}
