import { HighlightMarker } from '@/components/sections/highlight-marker';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import { profile } from '@/content/profile';
import { RULER_YEARS, checkTimelineHonesty, spanToGridLines } from '@/lib/content';
import './highlight.css';

const copy = profile.copy;

export function Highlight() {
  if (process.env.NODE_ENV === 'development') {
    const problems = checkTimelineHonesty();
    if (problems.length > 0) console.error('[highlight] timeline honesty:', problems);
  }
  const year = profile.highlight.year;
  const lines = spanToGridLines({ from: year, to: year });

  return (
    <Section id="highlight" pad="spacious">
      {/* Marker strip: decorative; the facts live in the heading and body.
          Entrance: the ruler wipes on year by year, then the marker draws over the highlight year. */}
      <div
        aria-hidden="true"
        data-rv-group
        data-rv-step="80"
        className="grid grid-rows-[auto_3rem]"
        style={{ gridTemplateColumns: `repeat(${RULER_YEARS.length}, minmax(0, 1fr))` }}
      >
        {RULER_YEARS.map((y, i) => (
          <div key={y} data-rv="wipe" className="ruler-ticks row-start-2 border-l border-hairline pt-2 pl-2" style={{ gridColumn: i + 1 }}>
            <span className="micro-caps text-ash">{y}</span>
          </div>
        ))}
        <HighlightMarker
          label={copy.highlight.markerLabel}
          className="row-start-1 row-end-3"
          style={{ gridColumn: `${lines.start} / ${lines.end}` }}
        />
      </div>

      <div className="page-grid mt-(--stack) gap-y-6">
        {/* The title rises out of a mask line (highlight.css; the heading's own cut plays inside
            it). The bottom padding keeps descenders inside the mask while it plays. */}
        <div data-rv-group className="col-span-full lg:col-start-1 lg:col-end-8">
          <div data-rv="mask" className="hl-title -mb-3 pb-3">
            <SectionHeading id="highlight" eyebrow={copy.highlight.eyebrow} display={copy.highlight.display} />
          </div>
        </div>
        <div
          data-rv-group
          data-rv-step="130"
          className="col-span-full flex flex-col gap-4 lg:col-start-8 lg:col-end-13 lg:self-end"
        >
          <p data-rv="focus" data-rv-delay="220" className="text-title text-smoke">
            {copy.highlight.kicker}
          </p>
          <p data-rv="focus" data-rv-delay="220" className="max-w-lead text-lead text-paper">
            {copy.highlight.body}
          </p>
        </div>
      </div>
    </Section>
  );
}
