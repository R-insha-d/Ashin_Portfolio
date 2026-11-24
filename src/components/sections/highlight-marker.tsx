import { cn } from '@/lib/cn';

type HighlightMarkerProps = { label: string; className?: string; style?: React.CSSProperties };

/**
 * Range marker over the whole highlight-year cell. Its entrance is driven by the scroll reveal
 * (the [data-rv-group] strip around it in highlight.tsx): the band draws on from the left, the
 * diamond pops at its start, then the label fades up. DOM order is the play order, so the label
 * comes last in the markup and is moved back on top with `order-first`.
 */
export function HighlightMarker({ label, className, style }: HighlightMarkerProps) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)} style={style}>
      <div className="relative flex-1">
        <div data-rv="draw" className="absolute inset-0 border-t-2 border-amber bg-amber-wash" />
        {/* 10px diamond centred on the band's top edge, at the cell's left edge. */}
        <span data-rv="pop" className="absolute -top-[5px] -left-[5px] block size-2.5">
          <span className="block size-full rotate-45 bg-amber" />
        </span>
      </div>
      <span data-rv="rise" className="micro-caps order-first pb-2 text-amber">
        {label}
      </span>
    </div>
  );
}
