import type * as React from 'react';
import { cn } from '@/lib/cn';
import { GrainOverlay } from '@/components/ui/grain-overlay';

export type MonitorFrameProps = {
  label: string;
  status?: React.ReactNode;
  aspect: '4 / 3' | '4 / 5' | '16 / 9';
  pictureClassName?: string;
  pictureRef?: React.Ref<HTMLDivElement>;
  pictureProps?: React.HTMLAttributes<HTMLDivElement>;
  footerStart?: React.ReactNode;
  footerCenter?: React.ReactNode;
  footerEnd?: React.ReactNode;
  footerSize?: 'sm' | 'lg';
  guides?: boolean;
  cropMarks?: boolean;
  grain?: boolean;
  vignette?: boolean;
  pictureOverlay?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** Program/Source monitor shell. Chrome lives only in the bars; nothing is drawn over the media. */
export function MonitorFrame({
  label,
  status,
  aspect,
  pictureClassName,
  pictureRef,
  pictureProps,
  footerStart,
  footerCenter,
  footerEnd,
  footerSize = 'sm',
  guides = false,
  cropMarks = false,
  grain = false,
  vignette = false,
  pictureOverlay,
  className,
  children,
}: MonitorFrameProps) {
  const hasFooter = footerStart != null || footerCenter != null || footerEnd != null;
  const { className: pictureExtraClass, style: pictureStyle, ...restPictureProps } = pictureProps ?? {};

  return (
    <div className={cn('overflow-hidden rounded-panel border border-hairline bg-panel shadow-panel', className)}>
      <div className="flex h-9 items-center justify-between gap-3 border-b border-hairline px-3">
        <span aria-hidden="true" className="micro-caps truncate text-ash">
          {label}
        </span>
        {status != null && <div className="flex shrink-0 items-center gap-2">{status}</div>}
      </div>

      <div
        ref={pictureRef}
        {...restPictureProps}
        className={cn('relative w-full overflow-hidden bg-void', pictureClassName, pictureExtraClass)}
        style={{ ...pictureStyle, aspectRatio: aspect }}
      >
        <div className="absolute inset-0">{children}</div>
        {vignette && <span aria-hidden="true" className="vignette pointer-events-none absolute inset-0" />}
        {grain && <GrainOverlay />}
        {guides && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute inset-[10%] border border-dashed border-rule" />
            <span className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-rule" />
            <span className="absolute top-1/2 left-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-rule" />
          </span>
        )}
        {cropMarks && <span aria-hidden="true" className="corner-brackets pointer-events-none absolute inset-3" />}
        {pictureOverlay != null && (
          <div className="pointer-events-none absolute inset-0 z-overlay *:pointer-events-auto">{pictureOverlay}</div>
        )}
      </div>

      {hasFooter && (
        <div
          className={cn(
            'grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-hairline px-3',
            footerSize === 'lg' ? 'h-14' : 'h-9',
          )}
        >
          <div aria-hidden="true" className="flex min-w-0 items-center gap-2 justify-self-start">
            {footerStart}
          </div>
          <div className="flex items-center gap-1 justify-self-center">{footerCenter}</div>
          <div aria-hidden="true" className="flex min-w-0 items-center gap-2 justify-self-end">
            {footerEnd}
          </div>
        </div>
      )}
    </div>
  );
}
