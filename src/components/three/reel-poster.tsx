import { ReelLineArt } from '@/components/ui/reel-line-art';
import { cn } from '@/lib/cn';

/** Server-safe poster: line art of the reel in its exact start pose (the canvas opens on this pose). */
export function ReelPoster({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('absolute inset-0', className)}>
      <ReelLineArt width="100%" height="100%" className="block size-full" />
    </div>
  );
}
